// Do-Not-Reply Mail Box service (009-do-not-reply-mailbox).
//
// Talks to the IMAPS mail server with ImapFlow (same stack as
// services/imapPoller.js) and parses messages with mailparser. Exposes a small
// read-only API consumed by routes/mailbox.js:
//   - listFolders(accountKey)
//   - listMessages({ account, folder, page, pageSize })  → paged, newest-first
//   - getMessage({ account, folder, uid })               → one message (peek)
//
// Credentials are resolved server-side from env (services/mailboxAccounts.js)
// and never leave the server. All reads use peek semantics so opening a message
// does not change its \Seen state (FR-010). Connections are per-request and
// time-bounded.

const { ImapFlow } = require("imapflow");
const { simpleParser } = require("mailparser");
const accounts = require("./mailboxAccounts");

const CONNECTION_TIMEOUT = 10 * 1000; // TCP connect
const GREETING_TIMEOUT = 10 * 1000; // server greeting
const SOCKET_TIMEOUT = 20 * 1000; // inactivity

// ─── Typed error ─────────────────────────────────────────────────────────────
class MailboxError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = "MailboxError";
    this.code = code; // 'auth'|'unreachable'|'timeout'|'parse'|'unavailable'|'unknown'
  }
}

// Map a raw ImapFlow / socket error to a safe, typed error. Detail is logged
// server-side only and never surfaced to the client (FR-011).
function classify(err) {
  if (err instanceof MailboxError) return err;
  const code = err && err.code;
  const msg = (err && err.message) || "";
  console.error(`${Date.now()} - mailbox ImapFlow error (code=${code}):`, msg);
  if (err && err.authenticationFailed) return new MailboxError("auth", "Mail server rejected the credentials");
  if (code === "ETIMEDOUT" || /time(?:d)?\s?out/i.test(msg)) return new MailboxError("timeout", "Mail server timed out");
  if (["ENOTFOUND", "ECONNREFUSED", "EAI_AGAIN", "ECONNRESET", "EHOSTUNREACH", "ENETUNREACH"].includes(code)) {
    return new MailboxError("unreachable", "Could not reach the mail server");
  }
  if (/auth|login|credential/i.test(msg)) return new MailboxError("auth", "Mail server rejected the credentials");
  return new MailboxError("unknown", "Mailbox request failed");
}

function requireAvailable(accountKey) {
  const acct = accounts.resolve(accountKey);
  if (!acct) throw new MailboxError("unknown", "Unknown account");
  if (!acct.available) throw new MailboxError("unavailable", "Account is not configured");
  return acct;
}

// Open a connection for one account, run `fn(client, acct)`, always log out.
async function withClient(accountKey, fn) {
  const acct = requireAvailable(accountKey);
  const client = new ImapFlow({
    host: acct.host,
    port: acct.port,
    secure: acct.port === 993,
    auth: { user: acct.user, pass: acct.pass },
    logger: false,
    tls: { rejectUnauthorized: false },
    connectionTimeout: CONNECTION_TIMEOUT,
    greetingTimeout: GREETING_TIMEOUT,
    socketTimeout: SOCKET_TIMEOUT,
  });

  try {
    await client.connect();
  } catch (err) {
    throw classify(err);
  }

  try {
    return await fn(client, acct);
  } catch (err) {
    throw classify(err);
  } finally {
    try {
      await client.logout();
    } catch {
      try { client.close(); } catch { /* ignore */ }
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Format an ImapFlow envelope address array into a display string.
function addrText(list) {
  if (!Array.isArray(list) || list.length === 0) return "";
  return list
    .map((a) => (a && a.name ? `${a.name} <${a.address || ""}>` : (a && a.address) || ""))
    .filter(Boolean)
    .join(", ");
}

function toMs(d) {
  if (!d) return null;
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
}

function summaryFromMessage(msg) {
  const env = msg.envelope || {};
  return {
    uid: msg.uid,
    date: toMs(env.date) || toMs(msg.internalDate),
    from: addrText(env.from),
    to: addrText(env.to),
    subject: env.subject || "",
    size: msg.size != null ? msg.size : null,
    seen: msg.flags ? msg.flags.has("\\Seen") : false,
  };
}

// ─── Public API ────────────────────────────────────────────────────────────────

// Mailbox folder names present on the account (best-effort / availability).
async function listFolders(accountKey) {
  return withClient(accountKey, async (client) => {
    const list = await client.list();
    return (list || []).map((f) => f.path);
  });
}

// A page of message summaries for one account+folder, newest first.
async function listMessages({ account, folder, page = 1, pageSize = 50 }) {
  const mailbox = accounts.imapFolderName(folder);
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeSize = Math.min(100, Math.max(10, parseInt(pageSize, 10) || 50));

  return withClient(account, async (client) => {
    let lock;
    try {
      lock = await client.getMailboxLock(mailbox);
    } catch {
      // Folder does not exist on this account → empty, not an error.
      return { account, folder, messages: [], page: safePage, pageSize: safeSize, total: 0, hasMore: false };
    }

    try {
      const total = (client.mailbox && client.mailbox.exists) || 0;
      if (total === 0) {
        return { account, folder, messages: [], page: safePage, pageSize: safeSize, total: 0, hasMore: false };
      }

      // Newest messages have the highest sequence numbers. Compute the page's
      // sequence range from the top.
      const hi = total - (safePage - 1) * safeSize;
      if (hi < 1) {
        return { account, folder, messages: [], page: safePage, pageSize: safeSize, total, hasMore: false };
      }
      const lo = Math.max(1, hi - safeSize + 1);

      const rows = [];
      for await (const msg of client.fetch(`${lo}:${hi}`, {
        uid: true,
        envelope: true,
        flags: true,
        size: true,
        internalDate: true,
      })) {
        rows.push(summaryFromMessage(msg));
      }
      // fetch() yields ascending sequence order → reverse for newest-first.
      rows.reverse();

      return {
        account,
        folder,
        messages: rows,
        page: safePage,
        pageSize: safeSize,
        total,
        hasMore: lo > 1,
      };
    } finally {
      lock.release();
    }
  });
}

// One full message by UID, parsed with mailparser. Peek semantics: if the
// message was unseen, its \Seen flag is restored after reading (FR-010).
async function getMessage({ account, folder, uid }) {
  const mailbox = accounts.imapFolderName(folder);
  const safeUid = parseInt(uid, 10);
  if (!Number.isFinite(safeUid) || safeUid <= 0) throw new MailboxError("unknown", "Invalid uid");

  return withClient(account, async (client) => {
    const lock = await client.getMailboxLock(mailbox);
    try {
      // Capture the seen state BEFORE fetching the body (fetching the source
      // may set \Seen on the server).
      const pre = await client.fetchOne(String(safeUid), { uid: true, flags: true }, { uid: true });
      if (!pre) throw new MailboxError("parse", "Message not found");
      const wasSeen = pre.flags ? pre.flags.has("\\Seen") : false;

      const msg = await client.fetchOne(
        String(safeUid),
        { uid: true, source: true, envelope: true },
        { uid: true }
      );
      if (!msg || !msg.source) throw new MailboxError("parse", "Message not found");

      let parsed;
      try {
        parsed = await simpleParser(msg.source);
      } catch {
        throw new MailboxError("parse", "Could not parse message");
      }

      // Restore unseen state if the fetch flipped it.
      if (!wasSeen) {
        try {
          await client.messageFlagsRemove(String(safeUid), ["\\Seen"], { uid: true });
        } catch { /* best-effort */ }
      }

      return {
        uid: msg.uid || safeUid,
        from: (parsed.from && parsed.from.text) || "",
        to: (parsed.to && parsed.to.text) || "",
        cc: (parsed.cc && parsed.cc.text) || "",
        subject: parsed.subject || "",
        date: parsed.date ? parsed.date.getTime() : null,
        text: parsed.text || null,
        html: parsed.html || null,
        attachments: (parsed.attachments || []).map((a) => ({
          filename: a.filename || "(unnamed)",
          contentType: a.contentType || "application/octet-stream",
          size: a.size || 0,
        })),
      };
    } finally {
      lock.release();
    }
  });
}

module.exports = {
  MailboxError,
  listFolders,
  listMessages,
  getMessage,
};
