'use strict';
// Standalone IMAP connectivity diagnostic for the support mailbox.
// Usage:  node scripts/test-imap.js
// It connects exactly the way services/imapPoller.js does and reports
// what it finds, so we can tell whether inbound email reading is possible.

require('dotenv').config();
const { ImapFlow } = require('imapflow');

const host = process.env.IMAP_HOST || process.env.SMTP_HOST;
const port = parseInt(process.env.IMAP_PORT || '993', 10);
const user = process.env.SMTP_SUPPORT_SENDER;
const pass = process.env.SMTP_SUPPORT_SENDER_PASS;

(async () => {
  console.log(`${Date.now()} - ── IMAP diagnostic ─────────────────────────────`);
  console.log(`${Date.now()} - Host :`, host);
  console.log(`${Date.now()} - Port :`, port, port === 993 ? '(implicit TLS)' : '(STARTTLS/plain)');
  console.log(`${Date.now()} - User :`, user);
  console.log(`${Date.now()} - Pass :`, pass ? `set (${pass.length} chars)` : 'NOT SET');
  console.log(`${Date.now()} - ────────────────────────────────────────────────`);

  if (!host || !user || !pass) {
    console.error(`${Date.now()} - ❌ Missing host/user/pass. Set SMTP_SUPPORT_SENDER(+_PASS) and optionally IMAP_HOST/IMAP_PORT.`);
    process.exit(1);
  }

  const client = new ImapFlow({
    host,
    port,
    secure: port === 993,
    auth: { user, pass },
    logger: false,
    tls: { rejectUnauthorized: false },
  });

  let connected = false;

  try {
    console.log(`${Date.now()} - Connecting…`);
    await client.connect();
    connected = true;
    console.log('✅ Connected and authenticated.');

    console.log('\nMailboxes available:');
    const boxes = await client.list();           // returns an array, not an async iterable
    for (const box of boxes) {
      console.log('  •', box.path);
    }

    const lock = await client.getMailboxLock('INBOX');
    try {
      const status = await client.status('INBOX', { messages: true, unseen: true });
      console.log(`${Date.now()} -`, '\nINBOX status:');
      console.log(`${Date.now()} -   Total messages :`, status.messages);
      console.log(`${Date.now()} -   Unseen         :`, status.unseen);

      const unseen = await client.search({ seen: false }, { uid: true });
      console.log(`${Date.now()} -   Unseen UIDs    :`, unseen.length ? unseen.join(', ') : '(none)');

      if (unseen.length) {
        console.log(`${Date.now()} -`, '\nMost recent unseen message headers:');
        const last = unseen[unseen.length - 1];
        for await (const msg of client.fetch(String(last), { envelope: true }, { uid: true })) {
          console.log('  From   :', msg.envelope?.from?.map(f => f.address).join(', '));
          console.log('  Subject:', msg.envelope?.subject);
          console.log('  Date   :', msg.envelope?.date);
        }
      }
    } finally {
      lock.release();
    }

    console.log('\n✅ Done. IMAP reading works — the poller can ingest replies from this mailbox.');
  } catch (err) {
    console.error('\n❌ IMAP connection FAILED:', err.message);
    console.error('\nCommon causes:');
    console.error('  1. IMAP access is disabled for this mailbox (ask the hosting team to enable it).');
    console.error('  2. Wrong IMAP host — SMTP host is not always the IMAP host. Ask for the IMAP server name.');
    console.error('  3. Wrong port — try 993 (SSL) or 143 (STARTTLS). Set IMAP_PORT accordingly.');
    console.error('  4. The address is a forwarder/alias, not a real mailbox (nothing to read from).');
    console.error('  5. Firewall blocks outbound IMAP from the server.');
    process.exitCode = 2;
  } finally {
    if (connected) {
      try {
        await client.logout();
      } catch {
        // logout can throw if the socket already dropped; ignore in a diagnostic
      }
    }
  }
})();