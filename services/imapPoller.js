'use strict';
require('dotenv').config();

const { ImapFlow }    = require('imapflow');
const { simpleParser } = require('mailparser');
const dbService       = require('./dbService');

const db = dbService.getDB();

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

let _io        = null;
let _timer     = null;
let _running   = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractTicketNumber(text) {
  const m = (text || '').match(/\bSUP-\d{8}-\d{6}\b/);
  return m ? m[0] : null;
}

function stripQuotedContent(text) {
  if (!text) return '';
  // Cut at common reply-quote markers
  const markers = [
    /^On .+ wrote:/m,
    /^-----+\s*Original Message\s*-----+/m,
    /^From:\s+.+/m,
    /^>{2,}/m,
  ];
  let cut = text.length;
  for (const re of markers) {
    const idx = text.search(re);
    if (idx !== -1 && idx < cut) cut = idx;
  }
  return text.slice(0, cut).trim();
}

function logActivity(ticketId, action, details = null) {
  db.prepare(
    `INSERT INTO support_ticket_activity (ticket_id, admin_id, action, old_value) VALUES (?, NULL, ?, ?)`
  ).run(ticketId, action, details);
}

// ─── Core inbox processing ────────────────────────────────────────────────────

async function processInbox() {
  if (_running) return; // prevent overlapping polls
  _running = true;

  const host = process.env.IMAP_HOST || process.env.SMTP_HOST;
  const port = parseInt(process.env.IMAP_PORT || '993', 10);

  const client = new ImapFlow({
    host,
    port,
    secure: port === 993,
    auth: {
      user: process.env.SMTP_SUPPORT_SENDER,
      pass: process.env.SMTP_SUPPORT_SENDER_PASS,
    },
    logger: false,
    tls: { rejectUnauthorized: false },
  });

  try {
    await client.connect();

    const lock = await client.getMailboxLock('INBOX');
    try {
      const uids = await client.search({ seen: false }, { uid: true });
      if (uids.length > 0) {
        for await (const msg of client.fetch(uids, { source: true }, { uid: true })) {
          await processMessage(client, msg);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    console.error('[IMAP Poller] Connection/processing error:', err.message);
    try { client.close(); } catch {}
  } finally {
    _running = false;
  }
}

async function processMessage(client, msg) {
  try {
    const parsed = await simpleParser(msg.source);

    const fromAddr   = parsed.from?.value?.[0]?.address || '';
    const subject    = parsed.subject || '';
    const inReplyTo  = parsed.inReplyTo || '';
    const refs       = Array.isArray(parsed.references) ? parsed.references : [];
    const messageId  = parsed.messageId || '';
    const textBody   = parsed.text || '';

    // Ignore messages we sent ourselves (avoids loops)
    if (fromAddr.toLowerCase() === (process.env.SMTP_SUPPORT_SENDER || '').toLowerCase()) {
      await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen'], { uid: true });
      return;
    }

    // 1. Match via email thread IDs (In-Reply-To + References)
    let ticket = null;
    const candidateIds = [inReplyTo, ...refs].filter(Boolean);
    for (const refId of candidateIds) {
      const thread = db.prepare('SELECT ticket_id FROM support_email_threads WHERE message_id = ?').get(refId);
      if (thread) {
        ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(thread.ticket_id);
        if (ticket) break;
      }
    }

    // 2. Fallback: extract ticket number from subject
    if (!ticket) {
      const num = extractTicketNumber(subject);
      if (num) ticket = db.prepare('SELECT * FROM support_tickets WHERE ticket_number = ?').get(num);
    }

    // Mark as read regardless of match result
    await client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen'], { uid: true });

    if (!ticket) {
      console.log(`[IMAP Poller] Unmatched email — from: ${fromAddr}, subject: "${subject}"`);
      return;
    }

    const cleanBody = stripQuotedContent(textBody) || `(Email reply from ${fromAddr})`;

    // Insert as public customer comment
    const row = db.prepare(
      `INSERT INTO support_ticket_comments (ticket_id, admin_id, comment, is_public, source) VALUES (?, NULL, ?, 1, 'customer')`
    ).run(ticket.id, cleanBody);

    // Store inbound Message-ID for future thread matching
    if (messageId) {
      try {
        db.prepare('INSERT OR IGNORE INTO support_email_threads (ticket_id, message_id) VALUES (?, ?)').run(ticket.id, messageId);
      } catch {}
    }

    db.prepare(
      `UPDATE support_tickets SET updated_at = datetime('now'), has_unread_customer_reply = 1 WHERE id = ?`
    ).run(ticket.id);

    logActivity(ticket.id, 'Customer Email Reply Received', `From: ${fromAddr}`);

    // Notify dashboard via socket
    if (_io) {
      _io.emit('support:new_reply', {
        ticket_id:     ticket.id,
        ticket_number: ticket.ticket_number,
        from:          fromAddr,
        comment_id:    row.lastInsertRowid,
      });
    }

    console.log(`[IMAP Poller] Matched reply from ${fromAddr} → ticket ${ticket.ticket_number}`);
  } catch (err) {
    console.error('[IMAP Poller] processMessage error:', err.message);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

function start(io) {
  if (!process.env.SMTP_SUPPORT_SENDER || !process.env.SMTP_SUPPORT_SENDER_PASS) {
    console.warn('[IMAP Poller] SMTP_SUPPORT_SENDER/PASS not configured — polling disabled.');
    return;
  }

  _io = io;
  console.log('[IMAP Poller] Started — polling every 2 minutes.');

  // First poll after 15 s (let the server finish booting)
  setTimeout(() => processInbox().catch(console.error), 15_000);
  _timer = setInterval(() => processInbox().catch(console.error), POLL_INTERVAL_MS);
}

function stop() {
  if (_timer) { clearInterval(_timer); _timer = null; }
}

module.exports = { start, stop };
