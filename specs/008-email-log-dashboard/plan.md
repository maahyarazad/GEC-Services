# Implementation Plan: Do-Not-Reply Email Log (Admin Dashboard Section)

**Branch**: `008-email-log-dashboard` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-email-log-dashboard/spec.md`

## Summary

Add an **Email Logs** section to the admin dashboard that lets an admin browse every
`do-not-reply@german-emirates-club.com` email the platform sends, grouped into categories, drill
into a category to see each email's sent time and recipient, and search across the log by recipient.

The platform currently keeps **no persistent record** of sent emails (sends are only
`console.log`'d), so this feature has two halves:

1. **Record sends (backend):** add one SQLite table (`email_log`) and a single best-effort logging
   call inside `sendRawEmailWithAttachments()` in `services/emailService.js` — the one transport that
   every do-not-reply email already flows through. Each high-level send function passes its
   *category*; the support sender (`…_AppSupport`, which uses `app.support@…`, not do-not-reply) is
   deliberately **not** instrumented.
2. **View the log (API + dashboard):** a small admin-guarded router (`routes/email_log.js`) exposes a
   categories summary and a paged/searchable entries endpoint, and a new lazy-loaded
   `EmailLogs` section is appended to the dashboard's `tabConfig`.

No new dependency. No change to any email's content, sender, or delivery. The log is **forward-only**
(see `research.md`): it shows sends from the moment it ships onward.

## Technical Context

**Language/Version**: Node.js + Express (CommonJS) backend; React 18 + Vite (JSX, incremental TSX)
frontend

**Primary Dependencies**: `better-sqlite3` (via `services/dbService.js`), `express`, `nodemailer`
(existing email transport); `@mui/material`, `react-router-dom`, `react-icons` on the client — all
present, **none added**

**Storage**: existing SQLite database `app.db` (`services/dbService.js`). One new table `email_log`
created by an idempotent startup migration, mirroring the `knowledge_base_view_log` pattern and
documented in `create_tables.sql`

**Testing**: No automated test framework is configured (root `package.json` `test` is the stub;
client scripts are `vite` / `build` / `eslint`). Validation is the manual scenario suite in
`quickstart.md`

**Target Platform**: Admin dashboard in desktop and mobile browsers; Node server under PM2

**Project Type**: Web application — Express backend at repo root + React SPA in `public/`

**Performance Goals**: Logging adds no user-perceptible send latency (single indexed INSERT,
best-effort, non-blocking of the send result). List endpoints page results (default 50, newest
first) so large categories never ship unbounded payloads

**Constraints**: Logging MUST be best-effort — a log write failure must never fail or delay a send
(FR-003). No email body/attachment content is stored (FR-012). Existing dashboard tab indices must
not shift (new section appended)

**Scale/Scope**: One table, one transport instrumentation point, one new router (2 endpoints), one
new client section component + 2 lines of wiring in `Dashboard.jsx`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) is an **unfilled template** — no
ratified principles exist, so there are no formal gates to enforce. In their place this plan holds
itself to the codebase's established, de-facto conventions, which it does not violate:

- **Reuse existing infrastructure** — SQLite via `dbService`, `authorize_admin` guard, the
  `tabConfig` + lazy-section dashboard pattern, the `CustomDataGrid` / Section fetch pattern. ✅
- **Idempotent startup migration** mirrored in `create_tables.sql` (as `knowledge_base_view_log`
  does). ✅
- **No new dependencies.** ✅
- **Observe, don't disturb** — the email-sending paths are changed only by adding a best-effort,
  failure-isolated logging call; delivery behaviour is untouched (FR-011). ✅
- **Minimise stored personal data** — no bodies/attachments; recipient + category + time + status
  only (FR-012). ✅

Initial Constitution Check: **PASS** (no gates defined; no convention violations).

## Project Structure

### Documentation (this feature)

```text
specs/008-email-log-dashboard/
├── plan.md              # This file (/speckit-plan command output)
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── email-log-api.md  # HTTP contract for the two admin endpoints
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created here)
```

### Source Code (repository root)

```text
# Backend (Express, repo root)
services/
├── emailService.js          # INSTRUMENT: add optional `category` param + best-effort log call
│                            #   inside sendRawEmailWithAttachments(); pass category from each
│                            #   high-level send function (event_confirm…, email_otp, …).
│                            #   DO NOT instrument …_AppSupport (app.support@, not do-not-reply).
├── emailLogService.js       # NEW: logEmailSend(), getCategories(), queryEntries() — the only
│                            #   module that touches the email_log table.
└── dbService.js             # existing SQLite handle (getDB()) — reused, unchanged

routes/
└── email_log.js             # NEW: GET /api/email-log/categories, GET /api/email-log/entries
                             #   guarded by authorize.authorize_admin

routes.js                    # EDIT: require + register the new router (root-mounted, like peers)
create_tables.sql            # EDIT: document the email_log DDL (source of truth mirror)

# Frontend (React SPA, public/)
public/src/components/
├── Dashboard/
│   ├── Dashboard.jsx        # EDIT: append "Email Logs" to tabConfig + lazy import + switch case
│   │                        #   (APPEND only — existing indices unchanged)
│   └── EmailLogs/
│       └── EmailLogs.jsx    # NEW: section component — search bar on top, category list,
│                            #   drill-down table (date-time + recipient), empty states
└── Sections/ or CustomDataGrid.jsx  # reused for the entries grid (existing component)
```

**Structure Decision**: Web application. The feature slots into the existing split — Express routers
under `routes/` + service modules under `services/` on the backend, and the React admin dashboard in
`public/src`. It follows two established precedents directly: `knowledge_base_view_log` for the
DB-backed, migration-on-startup logging table, and `ServerLogs` / the `Sections/*` components for the
log-viewer dashboard section. The new section is **appended** to `tabConfig` so every existing tab
keeps its current index (the switch in `Dashboard.jsx` is index-based).

## Complexity Tracking

> No constitution gates are defined and the design introduces no flagged complexity (no new
> datastore, no new dependency, one table, one instrumentation point). This section is intentionally
> empty.
