// Do-Not-Reply Mail Box service (009-do-not-reply-mailbox).
//
// The ONLY module that talks to the mail server, and it does so with the `curl`
// CLI ONLY (hard product constraint — no imapflow here). curl is run via
// child_process.execFile (NO shell → no injection); the IMAPS URL + credentials
// are written to curl's config on STDIN (`curl -K -`) so no credential ever
// appears in argv / `ps`. Every call is time-bounded. Fetches use BODY.PEEK so
// opening a message does not mark it \Seen (read-only, FR-010).
//
// Parsing the bytes curl returns is allowed to use the already-present
// `mailparser` (parsing is not fetching). See specs/009-do-not-reply-mailbox.

const { execFile } = require("child_process");
const { simpleParser } = require("mailparser");
const accounts = require("./mailboxAccounts");

const CURL_MAX_TIME = 20; // seconds (overall)
const CURL_CONNECT_TIMEOUT = 10; // seconds
const MAX_BUFFER = 30 * 1024 * 1024; // 30 MB cap on a single message/page

// ─── Typed error ─────────────────────────────────────────────────────────────
class MailboxError extends Error {
  constructor(code, message) {
    super(message || code);
    this.name = "MailboxError";
    this.code = code; // 'auth'|'unreachable'|'timeout'|'parse'|'unavailable'|'unknown'
  }
}

// Map a failed curl invocation to a safe, typed error. Raw stderr is logged
// server-side only and never attached to what the router returns.
function classifyCurlError(err, stderrBuf) {
  const stderr = (stderrBuf || "").toString().trim();
  console.error(`${Date.now()} - mailbox curl error (code=${err && err.code}):`, stderr);
  const code = err && typeof err.code === "number" ? err.code : null;
  switch (code) {
    case 28:
      return new MailboxError("timeout", "Mail server timed out");
    case 6: // couldn't resolve host
    case 7: // couldn't connect
    case 35: // TLS connect error
      return new MailboxError("unreachable", "Could not reach the mail server");
    case 67: // login denied
      return new MailboxError("auth", "Mail server rejected the credentials");
    default:
      if (err && err.killed) return new MailboxError("timeout", "Mail server timed out");
      return new MailboxError("unknown", "Mailbox request failed");
  }
}

// Escape a value for inclusion inside a curl config double-quoted string.
function cfgEscape(v) {
  return String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// Run one curl IMAPS call. `path` is the URL path after the host (already a safe,
// allow-listed mailbox name or empty); `request` is an optional raw IMAP command.
// Credentials come from the resolved account and go on stdin only.
function runCurl(acct, { path = "", request = null } = {}) {
  return new Promise((resolve, reject) => {
    const url = `imaps://${acct.host}:${acct.port}/${path}`;
    const args = [
      "-s",
      "-S",
      "-K",
      "-",
      "--max-time",
      String(CURL_MAX_TIME),
      "--connect-timeout",
      String(CURL_CONNECT_TIMEOUT),
    ];
    const child = execFile(
      "curl",
      args,
      { maxBuffer: MAX_BUFFER, encoding: "buffer" },
      (err, stdout, stderr) => {
        if (err) return reject(classifyCurlError(err, stderr));
        resolve(stdout); // Buffer
      }
    );
    let cfg = `url = "${cfgEscape(url)}"\n`;
    cfg += `user = "${cfgEscape(acct.user)}:${cfgEscape(acct.pass)}"\n`;
    if (request) cfg += `request = "${cfgEscape(request)}"\n`;
    child.stdin.on("error", () => {}); // ignore EPIPE if curl exits early
    child.stdin.write(cfg);
    child.stdin.end();
  });
}

// ─── IMAP FETCH response parsing ───────────────────────────────────────────────
// A small, literal-aware tokenizer for the subset of IMAP we request. It reads
// the parenthesised attribute list of each `* <n> FETCH ( ... )` record,
// honouring quoted strings, nested lists (FLAGS), section specifiers
// (BODY[HEADER.FIELDS (...)]), and {len} literals.

// Read the balanced content starting just AFTER an opening '(' at position `pos`
// in the latin1 view `s` (indices align 1:1 with bytes in `buf`). Returns
// { tokens, next } where next is the index just after the matching ')'.
function readTokens(buf, s, pos) {
  const tokens = [];
  let i = pos;
  const len = s.length;
  while (i < len) {
    const c = s[i];
    if (c === " " || c === "\t" || c === "\r" || c === "\n") {
      i++;
      continue;
    }
    if (c === ")") {
      return { tokens, next: i + 1 };
    }
    if (c === "(") {
      const inner = readTokens(buf, s, i + 1);
      tokens.push({ type: "list", value: inner.tokens });
      i = inner.next;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      let str = "";
      while (j < len) {
        if (s[j] === "\\" && j + 1 < len) {
          str += s[j + 1];
          j += 2;
          continue;
        }
        if (s[j] === '"') break;
        str += s[j];
        j++;
      }
      tokens.push({ type: "string", value: str });
      i = j + 1;
      continue;
    }
    if (c === "{") {
      const close = s.indexOf("}", i);
      const n = parseInt(s.slice(i + 1, close), 10);
      let start = close + 1;
      if (s[start] === "\r") start++;
      if (s[start] === "\n") start++;
      const slice = buf.slice(start, start + n);
      tokens.push({ type: "literal", value: slice });
      i = start + n;
      continue;
    }
    // atom — read until whitespace/paren, but keep [...] groups (which may
    // contain spaces and parens) intact.
    let j = i;
    let atom = "";
    let bracket = 0;
    while (j < len) {
      const ch = s[j];
      if (ch === "[") bracket++;
      else if (ch === "]") bracket--;
      else if (bracket === 0 && (ch === " " || ch === "\t" || ch === "\r" || ch === "\n" || ch === "(" || ch === ")")) {
        break;
      }
      atom += ch;
      j++;
    }
    tokens.push({ type: "atom", value: atom });
    i = j;
  }
  return { tokens, next: i };
}

// Interpret a FETCH record's flat token list into an attribute map.
function tokensToAttrs(tokens) {
  const attrs = {};
  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k];
    if (t.type !== "atom") continue;
    const keyRaw = t.value;
    const key = keyRaw.toUpperCase();
    const val = tokens[k + 1];
    if (key === "UID" || key === "RFC822.SIZE") {
      attrs[key] = val && (val.type === "atom" || val.type === "string") ? parseInt(val.value, 10) : null;
      k++;
    } else if (key === "INTERNALDATE") {
      attrs[key] = val && val.type === "string" ? val.value : null;
      k++;
    } else if (key === "FLAGS") {
      attrs.FLAGS = val && val.type === "list" ? val.value.map((x) => x.value) : [];
      k++;
    } else if (keyRaw.startsWith("BODY[") || keyRaw.startsWith("BODY.PEEK[") || keyRaw === "RFC822" || keyRaw === "RFC822.HEADER") {
      // The section's data is the next token: a literal (usual) or a string.
      if (val && val.type === "literal") attrs.BODY = val.value;
      else if (val && val.type === "string") attrs.BODY = Buffer.from(val.value, "latin1");
      k++;
    }
  }
  return attrs;
}

// Parse a full curl FETCH stdout buffer into an array of attribute maps.
function parseFetchRecords(buf) {
  const s = buf.toString("latin1");
  const records = [];
  const re = /\*\s+\d+\s+FETCH\s+\(/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const start = m.index + m[0].length;
    try {
      const { tokens, next } = readTokens(buf, s, start);
      records.push(tokensToAttrs(tokens));
      re.lastIndex = next; // skip past any literals we consumed
    } catch {
      // skip a malformed record rather than failing the whole page
    }
  }
  return records;
}

// Parse an IMAP SEARCH response ("* SEARCH 1 2 3 ...") into an array of ints.
function parseSearch(buf) {
  const s = buf.toString("latin1");
  const ids = [];
  const re = /^\*\s+SEARCH([^\r\n]*)/gim;
  let m;
  while ((m = re.exec(s)) !== null) {
    for (const n of m[1].trim().split(/\s+/)) {
      const v = parseInt(n, 10);
      if (Number.isFinite(v)) ids.push(v);
    }
  }
  return ids;
}

// IMAP INTERNALDATE ("13-Oct-2026 14:02:11 +0000") -> epoch ms, or null.
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
function parseInternalDate(str) {
  if (!str) return null;
  const m = str.match(/(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s*([+-]\d{4})?/);
  if (!m) return null;
  const [, dd, mon, yyyy, hh, mi, ss, tz] = m;
  const month = MONTHS[mon];
  if (month === undefined) return null;
  let ms = Date.UTC(+yyyy, month, +dd, +hh, +mi, +ss);
  if (tz) {
    const sign = tz[0] === "-" ? -1 : 1;
    const offMin = parseInt(tz.slice(1, 3), 10) * 60 + parseInt(tz.slice(3, 5), 10);
    ms -= sign * offMin * 60 * 1000;
  }
  return ms;
}

// ─── Public API ────────────────────────────────────────────────────────────────

function requireAvailable(accountKey) {
  const acct = accounts.resolve(accountKey);
  if (!acct) throw new MailboxError("unknown", "Unknown account");
  if (!acct.available) throw new MailboxError("unavailable", "Account is not configured");
  return acct;
}

// List mailbox folders actually present (best-effort; used for availability).
async function listFolders(accountKey) {
  const acct = requireAvailable(accountKey);
  const out = await runCurl(acct, { path: "" });
  const s = out.toString("latin1");
  const names = [];
  const re = /^\*\s+LIST\s+\([^)]*\)\s+(?:"[^"]*"|NIL)\s+(?:"([^"]*)"|(\S+))/gim;
  let m;
  while ((m = re.exec(s)) !== null) names.push(m[1] || m[2]);
  return names;
}

// A page of message summaries for one account+folder, newest first.
async function listMessages({ account, folder, page = 1, pageSize = 50 }) {
  const acct = requireAvailable(account);
  const mailbox = accounts.imapFolderName(folder);
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeSize = Math.min(100, Math.max(10, parseInt(pageSize, 10) || 50));

  // 1) UID list for the folder (ascending). Empty/missing folder -> empty page.
  let uids;
  try {
    const searchOut = await runCurl(acct, { path: encodeURIComponent(mailbox), request: "UID SEARCH ALL" });
    uids = parseSearch(searchOut);
  } catch (e) {
    if (e instanceof MailboxError && (e.code === "unknown" || e.code === "parse")) {
      return { account, folder, messages: [], page: safePage, pageSize: safeSize, total: 0, hasMore: false };
    }
    throw e;
  }

  const total = uids.length;
  if (total === 0) {
    return { account, folder, messages: [], page: safePage, pageSize: safeSize, total: 0, hasMore: false };
  }

  // 2) Newest first = highest UIDs. Slice the requested page.
  const desc = uids.slice().sort((a, b) => b - a);
  const startIdx = (safePage - 1) * safeSize;
  const pageUids = desc.slice(startIdx, startIdx + safeSize);
  if (pageUids.length === 0) {
    return { account, folder, messages: [], page: safePage, pageSize: safeSize, total, hasMore: false };
  }

  // 3) One FETCH for the page: scalar fields + header fields (peek).
  const set = pageUids.join(",");
  const req = `UID FETCH ${set} (UID RFC822.SIZE INTERNALDATE FLAGS BODY.PEEK[HEADER.FIELDS (DATE FROM TO SUBJECT)])`;
  const fetchOut = await runCurl(acct, { path: encodeURIComponent(mailbox), request: req });
  const records = parseFetchRecords(fetchOut);

  // 4) Parse each header block (decoded) with mailparser; build summaries.
  const byUid = new Map();
  await Promise.all(
    records.map(async (r) => {
      if (r.UID == null) return;
      let from = "";
      let to = "";
      let subject = "";
      let headerDate = null;
      if (r.BODY && r.BODY.length) {
        try {
          const h = await simpleParser(r.BODY);
          from = (h.from && h.from.text) || "";
          to = (h.to && h.to.text) || "";
          subject = h.subject || "";
          headerDate = h.date ? h.date.getTime() : null;
        } catch {
          /* fall back to internaldate / empty */
        }
      }
      byUid.set(r.UID, {
        uid: r.UID,
        date: headerDate || parseInternalDate(r.INTERNALDATE) || null,
        from,
        to,
        subject,
        size: r["RFC822.SIZE"] != null ? r["RFC822.SIZE"] : null,
        seen: Array.isArray(r.FLAGS) ? r.FLAGS.includes("\\Seen") : false,
      });
    })
  );

  // Preserve newest-first order (pageUids is already desc); drop any missing.
  const messages = pageUids.map((u) => byUid.get(u)).filter(Boolean);
  return {
    account,
    folder,
    messages,
    page: safePage,
    pageSize: safeSize,
    total,
    hasMore: startIdx + pageUids.length < total,
  };
}

// One full message (peek — does not mark \Seen), parsed with mailparser.
async function getMessage({ account, folder, uid }) {
  const acct = requireAvailable(account);
  const mailbox = accounts.imapFolderName(folder);
  const safeUid = parseInt(uid, 10);
  if (!Number.isFinite(safeUid) || safeUid <= 0) throw new MailboxError("unknown", "Invalid uid");

  const out = await runCurl(acct, {
    path: encodeURIComponent(mailbox),
    request: `UID FETCH ${safeUid} (UID BODY.PEEK[])`,
  });
  const records = parseFetchRecords(out);
  const rec = records.find((r) => r.BODY && r.BODY.length);
  if (!rec) throw new MailboxError("parse", "Message not found or could not be read");

  let parsed;
  try {
    parsed = await simpleParser(rec.BODY);
  } catch (e) {
    throw new MailboxError("parse", "Could not parse message");
  }

  return {
    uid: rec.UID != null ? rec.UID : safeUid,
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
}

module.exports = {
  MailboxError,
  listFolders,
  listMessages,
  getMessage,
  // exported for unit tests (no network):
  _test: { parseFetchRecords, parseSearch, parseInternalDate, readTokens, tokensToAttrs },
};
