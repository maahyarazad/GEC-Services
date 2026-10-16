# Implementation Plan: Event Template Dropdown (web_events)

**Branch**: `010-event-template-dropdown` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-event-template-dropdown/spec.md`

## Summary

Add a dropdown to the **Create New Event** modal in `EventSection.jsx` that lists the titles of every row in the external MySQL `web_events` table. Selecting a title seeds the modal's Title, Description, and Event Date & Time fields from that row. A new admin-guarded, read-only endpoint (`GET /api/web-events`) fetches `web_events` through the existing MySQL pool (`services/mysqlService.js` → `getPool()`), mirroring the query pattern already used in `routes/gec_members.js`. Event persistence is unchanged — the dropdown only pre-fills the form, which still saves via the existing `POST`/`PUT /api/events` flow.

## Technical Context

**Language/Version**: Node.js (CommonJS) backend; React 18 + Vite frontend (JavaScript/JSX).

**Primary Dependencies**: Backend — `express`, `mysql2/promise` (via `services/mysqlService.js`). Frontend — `@mui/material` (Autocomplete/Select, Dialog, TextField), existing `fetch` + `VITE_SERVERURL` pattern.

**Storage**: Read-only access to the external **MySQL** `web_events` table. The local admin `events` table is **SQLite** (`services/dbService.js`) and is untouched by this feature.

**Testing**: Manual validation via `quickstart.md` (project has no automated UI/integration suite for admin sections; consistent with features 008/009).

**Target Platform**: Admin dashboard (browser) + Express app server.

**Project Type**: Web application (React frontend under `public/`, Express backend at repo root).

**Performance Goals**: Dropdown populated from a single endpoint call on modal open; payload limited to id/title/description/date columns so "entire table" stays lightweight.

**Constraints**: Endpoint admin-only (inherits the `/api/` chokepoint from feature 008). Read-only against `web_events`. Modal must stay usable if MySQL is unreachable (non-blocking).

**Scale/Scope**: One new GET endpoint, one dropdown + seeding logic in one modal. No schema changes, no migrations.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution at `.specify/memory/constitution.md` is an unfilled template (placeholder principles only), so there are no ratified, enforceable gates. General best-practice gates applied in its place:

- **Reuse over new infrastructure**: uses the existing `getPool()` MySQL service and the existing `/api/events` save flow — no new service, no new transport. ✅
- **Least privilege**: endpoint mounted under the admin-guarded `/api/` prefix; read-only query; no write path to `web_events`. ✅
- **No scope creep**: no changes to event persistence, schema, or unrelated sections. ✅
- **Graceful degradation**: template load failure never blocks manual event creation. ✅

**Result**: PASS (no violations; no Complexity Tracking entries required).

## Project Structure

### Documentation (this feature)

```text
specs/010-event-template-dropdown/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── web-events-api.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
services/
└── mysqlService.js                 # EXISTING — getPool(); reused, not modified

routes/
└── events.js                       # MODIFIED — add GET /api/web-events (read-only, MySQL)

routes.js                           # UNCHANGED — events router already registered; /api/ prefix already guarded

public/src/components/Sections/
└── EventSection.jsx                # MODIFIED — add template dropdown + field-seeding in the Create/Edit modal
```

**Structure Decision**: Follow the existing split — a read-only MySQL endpoint added to the already-registered `routes/events.js`, and the UI change confined to the existing modal in `EventSection.jsx`. No new files are required on either side (an optional small helper for date normalisation may live inline in the component). This keeps the feature inside established, admin-guarded paths.

## Complexity Tracking

No constitution violations; no entries.

## Phase 0 — Research

See [research.md](./research.md). Resolves: exact `web_events` column mapping, where to mount the endpoint, which MUI control to use for the dropdown, date normalisation, and failure handling.

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md) — the Web Event template shape and its mapping onto the modal's form fields.
- [contracts/web-events-api.md](./contracts/web-events-api.md) — the `GET /api/web-events` contract.
- [quickstart.md](./quickstart.md) — manual validation scenarios.

## Post-Design Constitution Re-Check

Design introduces no new services, dependencies, or write paths; all additions sit behind the existing admin `/api/` gate. **Result: PASS.**
