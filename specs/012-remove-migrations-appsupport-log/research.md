# Phase 0 Research: Remove Migration IIFEs & Log App-Support Emails

## R1 — Which IIFEs are migrations (to remove) vs not (to keep)

**Decision**: Remove exactly three:
- `routes/support.js` — `(function runMigrations() { ... })()` (2 × `ALTER TABLE` + `CREATE TABLE support_email_threads`).
- `routes/knowledge_base.js` — `(function runMigrations() { ... })()` (`CREATE TABLE knowledge_base_view_log` + 2 indexes).
- `server.js` — `(async () => { ... })()` that *would* load `create_tables.sql` but whose body is entirely commented out (dead code).

**Keep** (not migrations): `routes/events.js:154` is `db.transaction(() => {...})()`; `routes/clubtime_guest_logs.js:200` is a row-combining IIFE. Neither touches schema.

**Rationale**: A repo-wide scan for `CREATE TABLE`/`ALTER TABLE` in `routes/`, `services/`, `server.js` returns only `support.js` and `knowledge_base.js`; `server.js`'s loader is the only other schema-related IIFE and is dead. `email_log.js` has **no** migration IIFE (its table lives only in `create_tables.sql`) — this is the existing precedent for the target end-state.

**Alternatives considered**: Introduce a real migration runner/versioned migrations — rejected: out of scope and contrary to the user's "remove … migration IIFE" intent; the project already treats `create_tables.sql` as the schema source.

## R2 — Is removal safe? (fresh vs existing DB)

**Decision**: Safe for the existing production DB (the IIFEs already ran there, so the tables/columns exist). For fresh DBs, safety requires the DDL to live in `create_tables.sql` — so **port first, then delete** (see R3).

**Rationale**: `server.js`'s `create_tables.sql` loader is commented out, so `create_tables.sql` is applied out-of-band (manual/ops) to fresh DBs. The per-route IIFEs were the only thing creating these tables/columns at runtime. Deleting them without porting would leave a fresh DB missing `support_email_threads` etc.

## R3 — Exact DDL to port into `create_tables.sql`

**Decision**: `create_tables.sql` coverage check (grep):

| Object | In create_tables.sql? | Action |
|---|---|---|
| `knowledge_base_view_log` (+ indexes) | **Yes** (already present) | verify indexes present; no change expected |
| `support_email_threads` | **No** | add `CREATE TABLE IF NOT EXISTS support_email_threads (...)` |
| `support_tickets.has_unread_customer_reply` | **No** | add column to the `support_tickets` CREATE TABLE block |
| `support_ticket_comments.source` | **No** | add column to the `support_ticket_comments` CREATE TABLE block |

Concrete DDL (from the support IIFE):
- `support_tickets`: add `has_unread_customer_reply INTEGER NOT NULL DEFAULT 0`.
- `support_ticket_comments`: add `source TEXT NOT NULL DEFAULT 'admin'`.
- New table:
  ```sql
  CREATE TABLE IF NOT EXISTS support_email_threads (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id  INTEGER NOT NULL,
    message_id TEXT    NOT NULL,
    created_at DATETIME DEFAULT (datetime('now')),
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id)
  );
  ```

**Rationale**: Columns go into the base `CREATE TABLE` (rather than `ALTER` statements) because `create_tables.sql` is only ever applied to a fresh DB; existing DBs already have the columns from the old ALTERs. This keeps `create_tables.sql` declarative and free of ALTERs.

**Alternatives considered**: Keep the ALTERs as a migration file — rejected: the user wants the IIFE migrations gone and the schema centralized.

## R4 — App-support logging: mirror the main transport

**Decision**: In `sendRawEmailWithAttachments_AppSupport`, after a successful `sendMail`, call
`emailLogService.logEmailSend({ category: "app-support", to, bcc, subject, status: "sent", response })`,
and in the `catch`, call it with `status: "failed", error` before re-throwing — exactly mirroring how `sendRawEmailWithAttachments` already logs (success at the top of `try`, failure in `catch`).

**Rationale**: `logEmailSend` is best-effort (never throws), already extracts recipients from `to`/`bcc`, and already records message id + SMTP response. The AppSupport function already captures `response` in its `try`. This is a 2-line addition that matches the established pattern, so delivery behaviour (return value / re-throw) is unchanged.

**Category**: a fixed string `"app-support"` is passed (not derived), since every send through this transport is app-support correspondence.

**Alternatives considered**: Logging at the route layer (`routes/support.js`) instead of the transport — rejected: the transport is the single choke point that already has success/failure + the nodemailer response, matching how every other category is logged.

## R5 — Category taxonomy entry

**Decision**: Add `"app-support": "App Support"` to `EMAIL_CATEGORIES` in `services/emailLogCategories.js`.

**Rationale**: Keys are stable and stored in `email_log.category`; labels are display-only. `labelFor('app-support')` then returns "App Support" and the dashboard category list/drill-down work with no UI change. Placing the key in the taxonomy (rather than relying on the label-fallback) makes it first-class and intentional.

## Resolved unknowns

| Unknown | Resolution |
|---|---|
| Which IIFEs to remove | support.js, knowledge_base.js, server.js (dead loader) — R1 |
| Removal safety | existing DB safe; port DDL first for fresh DBs — R2 |
| DDL to port | support_email_threads + 2 columns; kb_view_log already present — R3 |
| Where to log app-support | in the transport, mirroring sendRawEmailWithAttachments — R4 |
| Category | `app-support` → "App Support" in emailLogCategories.js — R5 |

No open NEEDS CLARIFICATION items remain.
