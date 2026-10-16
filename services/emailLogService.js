// Email log service (feature 008-email-log-dashboard).
//
// The ONLY module that touches the email_log table. It provides:
//   - logEmailSend(): best-effort writer, called from the email transport in
//     services/emailService.js for every do-not-reply send (one row per recipient).
//   - getCategories(): category summary for the dashboard's top-level list.
//   - queryEntries(): paged, optionally category-filtered and recipient-searched
//     list of entries for the drill-down + search bar.
//
// The table itself is created by an idempotent migration in routes/email_log.js
// (mirrored in create_tables.sql), following the knowledge_base_view_log pattern.

const dbService = require("./dbService");
const { labelFor, UNCATEGORISED, APP_SUPPORT } = require("./emailLogCategories");

// Translate the dashboard's mailbox toggle into a SQL fragment + params on the
// `category` column. "app-support" is the single app.support@ category; anything
// else (the default) is the do-not-reply@ mailbox, i.e. every other category.
function mailboxClause(mailbox) {
  if (mailbox === APP_SUPPORT) {
    return { sql: "category = ?", params: [APP_SUPPORT] };
  }
  // do-not-reply: everything except the app-support category.
  return { sql: "category <> ?", params: [APP_SUPPORT] };
}

// Normalise a `to`/`bcc` value (string, comma-separated string, array, or
// nodemailer address objects) into a flat list of lower-cased address strings.
function extractRecipients(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  const out = [];
  for (const item of list) {
    if (!item) continue;
    if (typeof item === "object") {
      // nodemailer accepts { address, name }
      if (item.address) out.push(String(item.address));
      continue;
    }
    // A single string may itself be a comma-separated list of addresses.
    String(item)
      .split(",")
      .forEach((addr) => {
        const trimmed = addr.trim();
        if (trimmed) out.push(trimmed);
      });
  }
  // De-duplicate and lower-case for consistent search.
  return [...new Set(out.map((a) => a.toLowerCase()))];
}

// Pull the two useful fields out of a nodemailer sendMail() result so we can
// trace a single send request: its Message-ID and the SMTP server's reply
// (e.g. "250 OK ..."). Missing/odd shapes degrade to null.
function extractResponse(response) {
  if (!response || typeof response !== "object") return { messageId: null, smtp: null };
  const messageId = response.messageId ? String(response.messageId).slice(0, 500) : null;
  const smtp = response.response ? String(response.response).slice(0, 500) : null;
  return { messageId, smtp };
}

// Best-effort: record one row per recipient for a single send attempt.
// NEVER throws — a logging failure must not affect email delivery (FR-003).
function logEmailSend({ category, to, bcc, subject, status, error, response } = {}) {
  try {
    const cat = category || UNCATEGORISED;
    const recipients = [...extractRecipients(to), ...extractRecipients(bcc)];
    if (recipients.length === 0) return; // nothing meaningful to log

    const now = Date.now();
    const safeStatus = status === "failed" ? "failed" : "sent";
    // Keep the error summary short; never store bodies/attachments (FR-012).
    const errSummary = error
      ? String(error.message || error).slice(0, 500)
      : null;
    const subj = subject ? String(subject).slice(0, 500) : null;
    const { messageId, smtp } = extractResponse(response);

    for (const recipient of recipients) {
      dbService.create("email_log", {
        category: cat,
        recipient,
        subject: subj,
        status: safeStatus,
        error: errSummary,
        message_id: messageId,
        response: smtp,
        created_at: now,
      });
    }
  } catch (err) {
    // Swallow — logging is best-effort only.
    console.error(`${Date.now()} - emailLogService.logEmailSend failed:`, err);
  }
}

// Category summary: one row per category that has at least one entry, most
// active first. Shape matches contracts/email-log-api.md.
function getCategories({ mailbox } = {}) {
  const db = dbService.getDB();
  const { sql, params } = mailboxClause(mailbox);
  const rows = db
    .prepare(
      `SELECT category,
              COUNT(*)        AS count,
              MAX(created_at) AS lastSent
         FROM email_log
        WHERE ${sql}
        GROUP BY category
        ORDER BY count DESC`
    )
    .all(...params);

  const categories = rows.map((r) => ({
    key: r.category,
    label: labelFor(r.category),
    count: r.count,
    lastSent: r.lastSent,
  }));
  const total = categories.reduce((sum, c) => sum + c.count, 0);
  return { categories, total };
}

// Paged entries, newest first. Optional category filter + recipient substring
// search, composed with AND. Shape matches contracts/email-log-api.md.
function queryEntries({ category, search, page, pageSize, mailbox } = {}) {
  const db = dbService.getDB();

  // Always scope to the selected mailbox, then AND any category/search filters.
  const mbox = mailboxClause(mailbox);
  const where = [mbox.sql];
  const params = [...mbox.params];
  if (category) {
    where.push("category = ?");
    params.push(String(category));
  }
  const term = (search || "").trim();
  if (term) {
    where.push("recipient LIKE ?");
    params.push(`%${term.toLowerCase()}%`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeSize = Math.min(200, Math.max(10, parseInt(pageSize, 10) || 50));
  const offset = (safePage - 1) * safeSize;

  const total = db
    .prepare(`SELECT COUNT(*) AS n FROM email_log ${whereSql}`)
    .get(...params).n;

  const rows = db
    .prepare(
      `SELECT id, category, recipient, subject, status, error, message_id, response, created_at
         FROM email_log
         ${whereSql}
        ORDER BY created_at DESC, id DESC
        LIMIT ? OFFSET ?`
    )
    .all(...params, safeSize, offset);

  const entries = rows.map((r) => ({
    id: r.id,
    category: r.category,
    label: labelFor(r.category),
    recipient: r.recipient,
    subject: r.subject,
    status: r.status,
    error: r.error,
    messageId: r.message_id,
    response: r.response,
    createdAt: r.created_at,
  }));

  return {
    entries,
    page: safePage,
    pageSize: safeSize,
    total,
    hasMore: offset + entries.length < total,
  };
}

module.exports = { logEmailSend, getCategories, queryEntries, extractRecipients };
