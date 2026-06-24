# Bug Ticket: IMAP Poller Cannot Read Inbox Messages

## Target Files

- `imapPoller.js`
- `support.js`

## Description

The IMAP poller is unable to correctly read incoming messages from the Inbox. use the JS code is provided in sample section

Review the provided example implementation and use it as a reference to identify and resolve the issue in `imapPoller.js`.

Additionally, review how `support.js` processes incoming messages and ensure that new emails are correctly consumed, parsed, and reflected in the UI.

## Requirements

1. Review the example implementation for retrieving Inbox messages via IMAP.
2. Fix any issues in `imapPoller.js` that prevent Inbox messages from being fetched correctly.
3. Verify that incoming emails are parsed and processed correctly.
4. Review and update the message consumption logic in `support.js`.
5. Ensure that newly received messages are reflected in the UI without errors.
6. Verify that message metadata (sender, subject, timestamp, content, etc.) is displayed correctly.
7. Add or update logging where necessary to assist with troubleshooting and validation.

## Expected Result

Incoming emails should be successfully retrieved from the Inbox, processed by the backend, and displayed correctly in the UI.

## Sample 

```js
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
  console.log('── IMAP diagnostic ─────────────────────────────');
  console.log('Host :', host);
  console.log('Port :', port, port === 993 ? '(implicit TLS)' : '(STARTTLS/plain)');
  console.log('User :', user);
  console.log('Pass :', pass ? `set (${pass.length} chars)` : 'NOT SET');
  console.log('────────────────────────────────────────────────');

  if (!host || !user || !pass) {
    console.error('❌ Missing host/user/pass. Set SMTP_SUPPORT_SENDER(+_PASS) and optionally IMAP_HOST/IMAP_PORT.');
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
    console.log('Connecting…');
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
      console.log('\nINBOX status:');
      console.log('  Total messages :', status.messages);
      console.log('  Unseen         :', status.unseen);

      const unseen = await client.search({ seen: false }, { uid: true });
      console.log('  Unseen UIDs    :', unseen.length ? unseen.join(', ') : '(none)');

      if (unseen.length) {
        console.log('\nMost recent unseen message headers:');
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
```

