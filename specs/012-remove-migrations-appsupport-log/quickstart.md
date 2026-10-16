# Quickstart & Validation: Migration Removal & App-Support Logging

See [contracts/email-log-app-support.md](./contracts/email-log-app-support.md)
and [data-model.md](./data-model.md).

## Prerequisites

- App server runnable against the existing `app.db`.
- A full-tier admin session for the dashboard.
- SMTP support-sender env vars set (`SMTP_SUPPORT_SENDER`, `SMTP_SUPPORT_SENDER_PASS`)
  for an actual app-support send, or inspect the `email_log` table directly.
- `sqlite3` CLI (or any SQLite client) to inspect a fresh schema.

## Part 1 — Migration IIFEs removed

### Step 1.1 — No startup migrations remain
```bash
grep -rnE "CREATE TABLE|ALTER TABLE" routes/ services/ server.js
```
**Expected**: no matches in route/server files (schema DDL lives only in `create_tables.sql`).

```bash
grep -rn "runMigrations" routes/ server.js
```
**Expected**: no matches.

### Step 1.2 — Canonical schema is complete
Build a throwaway DB from the schema and check the ported objects exist:
```bash
sqlite3 /tmp/schema_check.db < create_tables.sql
sqlite3 /tmp/schema_check.db ".tables" | tr ' ' '\n' | grep -E "support_email_threads|knowledge_base_view_log"
sqlite3 /tmp/schema_check.db "PRAGMA table_info(support_tickets);"        | grep has_unread_customer_reply
sqlite3 /tmp/schema_check.db "PRAGMA table_info(support_ticket_comments);" | grep source
sqlite3 /tmp/schema_check.db "PRAGMA index_list(knowledge_base_view_log);"
rm -f /tmp/schema_check.db
```
**Expected**: both tables present; both columns present; kb_view_log indexes present.

### Step 1.3 — Existing DB still works
Start the server against the current `app.db`; open the **Support** and
**Knowledge Base** dashboard sections.

**Expected**: server boots with no migration IIFE output; both sections load and
behave as before (no missing-table/column errors).

## Part 2 — App-support emails in the log

### Step 2.1 — Send an app-support email
Trigger a flow that calls `sendRawEmailWithAttachments_AppSupport` (e.g. a
support ticket reply), or call the transport in a REPL.

### Step 2.2 — It appears under "App Support"
Open the dashboard **Email Logs** section.

**Expected**: an **App Support** category appears; drilling in shows the send with
recipient, subject, `sent` status, and the message id / SMTP response.

Or inspect directly:
```bash
sqlite3 app.db "SELECT category, recipient, status, message_id FROM email_log WHERE category='app-support' ORDER BY created_at DESC LIMIT 5;"
```
**Expected**: rows with `category = app-support`.

### Step 2.3 — Failure path
Force a send failure (e.g. bad SMTP creds in a test env) and re-check.

**Expected**: a row with `status = failed` and a short error summary under
**App Support**; the caller still receives the thrown error (delivery behaviour
unchanged).

## Pass criteria

- [ ] Part 1.1: no `CREATE/ALTER TABLE` or `runMigrations` in route/server files.
- [ ] Part 1.2: fresh schema contains the ported tables/columns + kb indexes.
- [ ] Part 1.3: Support & Knowledge Base work on the existing DB.
- [ ] Part 2.2: successful app-support send logged under **App Support**.
- [ ] Part 2.3: failed send logged as `failed`; delivery behaviour unchanged.
