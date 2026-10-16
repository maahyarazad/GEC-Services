# Implementation Plan: Remove Runtime Migration IIFEs & Log App-Support Emails

**Branch**: `012-remove-migrations-appsupport-log` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-remove-migrations-appsupport-log/spec.md`

## Summary

Two related backend clean-ups:

1. **Remove runtime DB-migration IIFEs.** Delete the `runMigrations()` IIFEs in `routes/support.js` and `routes/knowledge_base.js` and the commented-out schema-loader IIFE in `server.js`. First port any DDL not yet in `create_tables.sql` (the support thread table + two columns) so the canonical schema stays complete and fresh DBs are unaffected.
2. **Log app-support emails.** Make `sendRawEmailWithAttachments_AppSupport` call the existing `emailLogService.logEmailSend` on success/failure with a new `app-support` category, so support emails show up in the Email Logs dashboard. Add the `app-support → "App Support"` entry to the category taxonomy.

No new dependencies, no new runtime migration mechanism, no Email-Logs UI change (it surfaces the new category automatically).

## Technical Context

**Language/Version**: Node.js (CommonJS) backend; better-sqlite3 for the local DB.

**Primary Dependencies**: `express`, `better-sqlite3` (`services/dbService`), `nodemailer` (transport), existing `services/emailLogService` + `services/emailLogCategories`.

**Storage**: Local SQLite (`app.db`), schema in `create_tables.sql`. External MySQL unaffected. No schema change to `email_log` (already present); additive DDL to `create_tables.sql` only (support tables/columns).

**Testing**: Manual via `quickstart.md` (no automated suite for these areas; consistent with features 008–011). A fresh-DB schema check validates the port.

**Target Platform**: Express app server + admin dashboard.

**Project Type**: Web application.

**Performance Goals**: N/A (removing startup work; one extra best-effort log write per app-support send).

**Constraints**: Removal must be behaviour-preserving on the existing production DB and complete for fresh DBs. App-support logging must be best-effort (never break delivery). `create_tables.sql` stays the single schema source; no new runtime migrator.

**Scale/Scope**: 3 files for the IIFE removal (`server.js`, `routes/support.js`, `routes/knowledge_base.js`) + `create_tables.sql`; 2 files for logging (`services/emailService.js`, `services/emailLogCategories.js`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unfilled template — no ratified gates. Best-practice gates applied:

- **Single source of truth**: schema consolidates into `create_tables.sql`; removes scattered startup migrations. ✅
- **Behaviour-preserving refactor**: DDL is ported before IIFEs are deleted, so neither fresh nor existing DBs lose anything. ✅
- **Reuse over new infrastructure**: app-support logging reuses `logEmailSend`; only one category key added. ✅
- **Safety**: logging is best-effort; delivery path unchanged. ✅

**Result**: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/012-remove-migrations-appsupport-log/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── email-log-app-support.md
└── tasks.md            # /speckit-tasks — NOT created here
```

### Source Code (repository root)

```text
server.js                         # MODIFIED — delete the commented-out schema-loader IIFE
create_tables.sql                 # MODIFIED — add support_email_threads, support_tickets.has_unread_customer_reply,
                                  #            support_ticket_comments.source (knowledge_base_view_log already present)
routes/support.js                 # MODIFIED — delete runMigrations() IIFE
routes/knowledge_base.js          # MODIFIED — delete runMigrations() IIFE
services/emailService.js          # MODIFIED — log app-support sends (success + failure)
services/emailLogCategories.js    # MODIFIED — add app-support → "App Support"
```

**Structure Decision**: Pure backend edits across existing files; no new modules. The DDL port into `create_tables.sql` is the safety prerequisite that lets the IIFEs be deleted without regressing fresh-DB setup.

## Complexity Tracking

No constitution violations; no entries.

## Phase 0 — Research

See [research.md](./research.md). Resolves: which IIFEs are migrations vs not, the exact DDL to port, whether removal is safe on existing DBs, and how app-support logging mirrors the main transport.

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md) — the DDL delta for `create_tables.sql` and the `email_log` row shape for app-support.
- [contracts/email-log-app-support.md](./contracts/email-log-app-support.md) — the logging behaviour contract (and the unchanged Email-Logs API surfacing the new category).
- [quickstart.md](./quickstart.md) — manual validation + fresh-DB schema check.

## Post-Design Constitution Re-Check

No new services/dependencies/migrators; schema consolidation + one reused log call. **Result: PASS.**
