# Contract: App-Support Email Logging & Schema Consolidation

Backend-only. No HTTP contract changes. The existing Email-Logs API
(`GET /api/email-log/categories`, `GET /api/email-log/entries`) is unchanged and
surfaces the new category automatically.

## 1. Transport logging behaviour — `sendRawEmailWithAttachments_AppSupport`

File: `services/emailService.js`.

**On success** (after `transporter.sendMail` resolves):
- Calls `emailLogService.logEmailSend({ category: "app-support", to, bcc, subject, status: "sent", response })`.
- Returns the nodemailer `response` exactly as before (logging never changes the return value).

**On failure** (in `catch`, before re-throwing):
- Calls `emailLogService.logEmailSend({ category: "app-support", to, bcc, subject, status: "failed", error })`.
- Re-throws the original error exactly as before.

**Guarantees**:
- Best-effort: `logEmailSend` never throws (its own try/catch); a logging failure does not affect send success/failure or the thrown error.
- No bodies/attachments are logged (only recipient, subject, status, error summary, message id, SMTP response) — same as every other category.
- Recipient extraction handles string / comma-list / array `to`/`bcc` (existing `logEmailSend` behaviour).

## 2. Category taxonomy — `services/emailLogCategories.js`

- `EMAIL_CATEGORIES` includes `"app-support": "App Support"`.
- Stored value in `email_log.category` is the key `app-support`.
- Dashboard label is `App Support` via `labelFor`.

## 3. Email-Logs API (unchanged, documented for completeness)

- `GET /api/email-log/categories` → now may include
  `{ key: "app-support", label: "App Support", count, lastSent }` once such
  emails exist.
- `GET /api/email-log/entries?category=app-support` → returns the app-support
  rows (recipient, subject, status, error, messageId, response, createdAt).
- Both remain admin-guarded by the existing `/api/` chokepoint.

## 4. Schema consolidation (no runtime behaviour contract, but a structural one)

File: `create_tables.sql`.

- MUST declare `support_email_threads`, `support_tickets.has_unread_customer_reply`,
  and `support_ticket_comments.source` (ported from the removed `routes/support.js`
  IIFE), plus the already-present `knowledge_base_view_log` (+ indexes).
- After this, no route/server file executes `CREATE TABLE`/`ALTER TABLE` at
  import/startup.

**Non-goal**: this feature does not add a runtime applier for `create_tables.sql`;
how fresh DBs apply it is unchanged (out-of-band).
