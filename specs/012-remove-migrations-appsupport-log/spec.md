# Feature Specification: Remove Runtime Migration IIFEs & Log App-Support Emails

**Feature Branch**: `012-remove-migrations-appsupport-log`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "first remove all the database migration IIFE from server codes - add email_log to the sendRawEmailWithAttachments_AppSupport so I can see them the email log section of dashboard and the category should be app support"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Remove runtime DB migration IIFEs (Priority: P1)

The app no longer performs ad-hoc schema migrations at server startup from inside route/server files. Every table/column those migrations created is instead declared in the canonical schema file (`create_tables.sql`), so the schema has one source of truth and startup is free of scattered `runMigrations()` side-effects.

**Why this priority**: The user asked for this "first". Removing the scattered startup IIFEs is a prerequisite clean-up; it must not drop any table/column the running app depends on.

**Independent Test**: Start the server against the existing database — it boots with no migration IIFEs running, and the Support and Knowledge Base sections continue to work (their tables/columns still exist). A fresh database built from `create_tables.sql` contains every table/column the removed IIFEs used to create.

**Acceptance Scenarios**:

1. **Given** the server source, **When** the migration IIFEs are removed, **Then** no route or server file runs `CREATE TABLE` / `ALTER TABLE` at import/startup time.
2. **Given** `create_tables.sql`, **When** it is applied to a fresh database, **Then** it contains `support_email_threads`, the `support_tickets.has_unread_customer_reply` column, the `support_ticket_comments.source` column, and `knowledge_base_view_log` (+ its indexes) — i.e. everything the removed IIFEs created.
3. **Given** the existing production database (where the old migrations already ran), **When** the server starts without the IIFEs, **Then** Support and Knowledge Base features behave exactly as before (no missing-table/column errors).
4. **Given** `server.js`, **When** reviewed, **Then** the commented-out `create_tables.sql`-loader IIFE (dead code) is removed.

---

### User Story 2 - App-support emails appear in the email log (Priority: P1)

Emails sent through the app-support transport (`sendRawEmailWithAttachments_AppSupport`) are recorded in the do-not-reply email log so an admin can see them in the dashboard's Email Logs section, grouped under an **App Support** category.

**Why this priority**: Direct user request; gives visibility into support correspondence alongside the other logged email categories.

**Independent Test**: Trigger an app-support email send, then open Email Logs in the dashboard — the send appears under the "App Support" category with recipient, subject, status, and (on success) the nodemailer message id / SMTP response.

**Acceptance Scenarios**:

1. **Given** an app-support email is sent successfully, **When** the admin opens Email Logs, **Then** a row appears under the **App Support** category with status `sent`, the recipient(s), subject, and the message id / SMTP response.
2. **Given** an app-support email send fails, **When** the admin opens Email Logs, **Then** a row appears under **App Support** with status `failed` and a short error summary.
3. **Given** the Email Logs category list, **When** app-support emails exist, **Then** the category label shown is **App Support** (a stable key `app-support` under the hood).
4. **Given** a logging failure (e.g. log write error), **When** an app-support email is sent, **Then** email delivery is unaffected (logging is best-effort, never throws into the send path).

---

### Edge Cases

- **Migration removal on a fresh vs existing DB**: existing DBs already have the columns/tables (old IIFEs ran); fresh DBs rely on `create_tables.sql`. The removal must be safe for both — hence the DDL is ported before deletion.
- **`create_tables.sql` not auto-applied at runtime**: the server's schema-loader IIFE is currently commented out, so `create_tables.sql` is applied out-of-band. Removing the route IIFEs does not change how/whether `create_tables.sql` is applied; it only ensures the canonical schema is complete.
- **App-support recipients**: `to`/`bcc` may be strings, comma lists, or arrays — the existing log recipient-extraction already handles these.
- **App-support is a reply transport**: these emails use a different SMTP sender and may be customer replies; they are still logged (the user wants them visible), tagged `app-support`.
- **Idempotent DDL**: ported statements use `CREATE TABLE IF NOT EXISTS`; columns added to existing `CREATE TABLE` blocks must not duplicate existing columns.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All runtime DB-migration IIFEs MUST be removed from server/route code — specifically the `runMigrations()` IIFEs in `routes/support.js` and `routes/knowledge_base.js`, and the commented-out schema-loader IIFE in `server.js`.
- **FR-002**: Before removal, every table/column created by those IIFEs MUST be represented in `create_tables.sql`: `support_email_threads` table; `support_tickets.has_unread_customer_reply` column; `support_ticket_comments.source` column; `knowledge_base_view_log` table + indexes (verify existing coverage).
- **FR-003**: Removing the IIFEs MUST NOT change the behaviour of the Support or Knowledge Base features against the existing database.
- **FR-004**: No new runtime migration mechanism is introduced; `create_tables.sql` remains the canonical schema source.
- **FR-005**: `sendRawEmailWithAttachments_AppSupport` MUST record each send in the email log via the existing `emailLogService.logEmailSend`, on both success (`sent`, with the nodemailer response) and failure (`failed`, with the error), without changing its return/throw behaviour.
- **FR-006**: App-support log entries MUST use a stable category key `app-support`, with the dashboard label **App Support**, added to the email-log category taxonomy (`services/emailLogCategories.js`).
- **FR-007**: Email-log writes from the app-support transport MUST be best-effort — a logging failure MUST NOT affect email delivery.
- **FR-008**: The app-support emails MUST become visible in the existing Email Logs dashboard section with no UI change required (they appear via the existing categories/entries endpoints).

### Key Entities *(include if feature involves data)*

- **Email Log entry (`email_log`)**: existing table; app-support sends add rows with `category = 'app-support'`, recipient, subject, status, error, message_id, response. No schema change (table already present).
- **Email category taxonomy**: existing `EMAIL_CATEGORIES` map; gains one entry `app-support → "App Support"`.
- **Canonical schema (`create_tables.sql`)**: gains the support DDL currently applied only by the runtime IIFE.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero `CREATE TABLE`/`ALTER TABLE` statements execute at server startup from route/server files (0 runtime migration IIFEs remain).
- **SC-002**: A fresh DB built from `create_tables.sql` has 100% of the tables/columns the removed IIFEs used to create.
- **SC-003**: Support and Knowledge Base features work unchanged after removal (0 missing-table/column errors on the existing DB).
- **SC-004**: 100% of app-support email sends (success and failure) produce an `email_log` row under the `app-support` category.
- **SC-005**: The Email Logs dashboard shows an **App Support** category once app-support emails have been sent.

## Assumptions

- `create_tables.sql` is the project's canonical schema and is applied out-of-band to fresh databases (the runtime loader is intentionally disabled); this feature keeps that model.
- The existing production database already contains the columns/tables the removed IIFEs created (the IIFEs ran on prior deploys), so removal is safe there.
- The email-log infrastructure (table, `emailLogService`, categories, Email Logs UI) already exists on the base branch and is reused unchanged except for the new category key.
- App-support emails are acceptable to store in the do-not-reply email log for visibility; no additional privacy constraint beyond the existing log (no bodies/attachments stored).
