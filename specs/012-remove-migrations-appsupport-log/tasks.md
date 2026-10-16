# Tasks: Remove Runtime Migration IIFEs & Log App-Support Emails

**Feature**: `012-remove-migrations-appsupport-log` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

**Inputs**: plan.md, spec.md, research.md, data-model.md, contracts/email-log-app-support.md, quickstart.md

**Tests**: Not requested (no automated suite for these areas; validation is manual via quickstart.md, incl. a fresh-DB schema check). No test tasks generated.

**Conventions**: `[P]` = parallelizable (different file / no incomplete dependency). Story labels `[US1]`/`[US2]` map to spec.md. Paths are repo-relative.

**Critical ordering (US1)**: the DDL MUST be ported into `create_tables.sql` BEFORE the corresponding IIFE is deleted, so a fresh DB never loses a table/column.

---

## Phase 1: Setup

- [X] T001 Verify the current migration surface before editing: run `grep -rnE "CREATE TABLE|ALTER TABLE|runMigrations" routes/ services/ server.js` and confirm the only migration IIFEs are in `routes/support.js` and `routes/knowledge_base.js` (plus the commented-out loader in `server.js`); note the exact DDL each applies.

---

## Phase 2: Foundational

**Purpose**: No cross-story blocking work. US1 (schema/migrations) and US2 (app-support logging) are independent and can proceed in parallel. (Section intentionally empty.)

---

## Phase 3: User Story 1 — Remove runtime DB migration IIFEs (Priority: P1) 🎯 MVP

**Goal**: No route/server file runs schema DDL at startup; `create_tables.sql` holds every table/column the removed IIFEs created.

**Independent Test**: `grep` shows no `CREATE/ALTER TABLE` or `runMigrations` in route/server files; a fresh DB built from `create_tables.sql` contains `support_email_threads`, the two support columns, and `knowledge_base_view_log` (+ indexes); Support & Knowledge Base work on the existing DB (quickstart Part 1).

### Port DDL into the canonical schema FIRST

- [X] T002 [US1] In `create_tables.sql`, add `has_unread_customer_reply INTEGER NOT NULL DEFAULT 0` to the `support_tickets` CREATE TABLE block (after `resolved_at`), with a short comment noting it was previously an `ALTER` in the removed support IIFE.
- [X] T003 [US1] In `create_tables.sql`, add `source TEXT NOT NULL DEFAULT 'admin'` to the `support_ticket_comments` CREATE TABLE block, with a short comment noting its origin.
- [X] T004 [US1] In `create_tables.sql`, add a `CREATE TABLE IF NOT EXISTS support_email_threads (id INTEGER PK AUTOINCREMENT, ticket_id INTEGER NOT NULL, message_id TEXT NOT NULL, created_at DATETIME DEFAULT (datetime('now')), FOREIGN KEY (ticket_id) REFERENCES support_tickets(id))` block near the other support tables.
- [X] T005 [US1] In `create_tables.sql`, verify `knowledge_base_view_log` and its indexes `idx_kb_view_log_topic` / `idx_kb_view_log_created` are already declared; add any that are missing to match the removed `routes/knowledge_base.js` IIFE.

### Then delete the IIFEs

- [X] T006 [US1] In `routes/support.js`, delete the `(function runMigrations() { ... })()` block (the two ALTERs + `support_email_threads` CREATE) now covered by `create_tables.sql`; leave the rest of the file intact.
- [X] T007 [P] [US1] In `routes/knowledge_base.js`, delete the `(function runMigrations() { ... })()` block (now covered by `create_tables.sql`).
- [X] T008 [P] [US1] In `server.js`, delete the commented-out `(async () => { ... })()` schema-loader IIFE (dead code); keep the DB connection setup above it.

### Verify

- [X] T009 [US1] Build a throwaway DB from the schema and confirm the ported objects exist: `sqlite3 /tmp/schema_check.db < create_tables.sql`, then check `support_email_threads`, `knowledge_base_view_log`, `support_tickets.has_unread_customer_reply`, `support_ticket_comments.source`, and the kb indexes (quickstart Step 1.2); remove the temp DB.
- [ ] T010 [US1] Start the server against the existing `app.db` and confirm no migration output and that Support + Knowledge Base sections load without missing-table/column errors (quickstart Step 1.3).

**Checkpoint**: Quickstart Part 1 passes — no startup migrations, complete canonical schema, existing DB unaffected.

---

## Phase 4: User Story 2 — App-support emails in the email log (Priority: P1)

**Goal**: `sendRawEmailWithAttachments_AppSupport` records each send in `email_log` under the `app-support` category, visible in the Email Logs dashboard.

**Independent Test**: send an app-support email, confirm an `email_log` row under `app-support` (and an **App Support** category in the dashboard); a failed send logs `failed` without changing delivery behaviour (quickstart Part 2).

- [X] T011 [P] [US2] In `services/emailLogCategories.js`, add `"app-support": "App Support"` to the `EMAIL_CATEGORIES` map (stable key + display label).
- [X] T012 [US2] In `services/emailService.js`, in `sendRawEmailWithAttachments_AppSupport`, after `const response = await transporter.sendMail(...)` succeeds, call `emailLogService.logEmailSend({ category: "app-support", to, bcc, subject, status: "sent", response })` before returning `response` (do not change the return value).
- [X] T013 [US2] In `services/emailService.js`, in the same function's `catch`, call `emailLogService.logEmailSend({ category: "app-support", to, bcc, subject, status: "failed", error })` before re-throwing (do not change the thrown error). `emailLogService` is already required at the top of the file.

**Checkpoint**: Quickstart Part 2 passes — successful and failed app-support sends appear under **App Support**; delivery behaviour unchanged.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T014 [P] Sanity-check `services/emailService.js` parses/loads (`node -c services/emailService.js`) and that `routes/support.js`, `routes/knowledge_base.js`, `server.js` still `node -c` cleanly after the IIFE removals.
- [ ] T015 Run the full `quickstart.md` (Parts 1 & 2, all pass criteria) against a running server with a full-tier admin session.

---

## Dependencies & Execution Order

- **US1 internal order is strict**: T002–T005 (port DDL) → T006–T008 (delete IIFEs) → T009–T010 (verify). Never delete an IIFE (T006) before its DDL is in `create_tables.sql` (T002–T004).
- **US1 ⟂ US2**: the two stories touch disjoint files and can proceed independently/in parallel.
- **Within US1**: T002–T005 all edit `create_tables.sql` → sequential. T006 edits `support.js`; T007 (`knowledge_base.js`) and T008 (`server.js`) are `[P]` with it and each other (different files).
- **Within US2**: T011 edits `emailLogCategories.js` (`[P]`); T012 and T013 edit the same function in `emailService.js` → sequential.
- **Phase 5** after both stories.

### Story completion order

```
Setup (T001)
   ├─> US1: port DDL (T002–T005) → delete IIFEs (T006–T008) → verify (T009–T010)
   └─> US2: category (T011) + transport logging (T012–T013)   [independent of US1]
          └─> Polish (T014–T015)
```

## Parallel Opportunities

- US1 and US2 can be worked in parallel (disjoint files).
- US1: T007 ‖ T008 (different files), both parallel to T006.
- US2: T011 ‖ (T012→T013).
- Polish: T014 ‖ nothing critical; T015 is the final manual pass.

## Implementation Strategy

- **MVP = Phase 3 (US1, T001–T010)**: the user's explicit "first" — remove the migration IIFEs with the schema safely consolidated. Shippable alone.
- **Increment 2 = Phase 4 (US2)**: app-support email logging + category.
- **Increment 3 = Phase 5**: parse checks + quickstart sign-off.
