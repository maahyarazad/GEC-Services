# Implementation Plan: Unsubscribed Contacts Panel

**Branch**: `006-unsubscribe-contacts-list` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-unsubscribe-contacts-list/spec.md`

## Summary

Add an **Unsubscribed** button to the "Manage Data" group of the WhatsApp Broadcast section that
opens a `SlideMenu` panel listing every row in `unsubscribe_contacts`, LEFT JOINed to
`contact_book` on phone so unmatched opt-outs still appear. The grid is `CustomDataGrid` in
server-side mode, fed by a new `GET /api/unsubscribe-contacts` built on the LEFT JOIN support that
already exists in `dbService`. Each row carries a delete action that, after confirmation through
the existing `AlertProvider` dialog, hard-deletes the row via a new
`DELETE /api/unsubscribe-contacts`, returning the phone to the broadcast audience.

No schema changes. No new dependencies. Every backend and frontend primitive this feature needs
already exists and is in production use — the work is composition, not new infrastructure.

## Technical Context

**Language/Version**: Node.js (CommonJS) backend — local v22.23.2, deploy target v20.20.2;
React 18 + Vite frontend, JSX with incremental TSX adoption

**Primary Dependencies**: Express 4, better-sqlite3 12, MUI (`@mui/material`, `@mui/x-data-grid`),
`react-icons`, `react-modal`, Redux Toolkit — all already in `package.json`; **none added**

**Storage**: SQLite via better-sqlite3 (`app.db` at repo root, `services/dbService.js`).
Tables `unsubscribe_contacts` (`create_tables.sql:457`) and `contact_book` (`create_tables.sql:51`)
already exist — no migration

**Testing**: No automated test framework is configured (`package.json` `test` script is the
default `exit 1` stub). Validation is the manual scenario suite in `quickstart.md`, plus direct
better-sqlite3 assertions against `app.db`

**Target Platform**: Linux server behind systemd/pm2
(`pm2-services.german-emirates-club.com.service`), browser dashboard

**Project Type**: Web application — Express API + React SPA in the same repo (`public/`)

**Performance Goals**: Parity with the existing Contact Book panel. Server-side pagination keeps
per-request rows at the page size (25–100) regardless of table growth

**Constraints**: Reuse existing components (`SlideMenu`, `CustomDataGrid`, `AlertProvider`,
`dbService`) rather than introducing parallel implementations; delete must be a true hard delete;
no changes to broadcast sending behaviour

**Scale/Scope**: `unsubscribe_contacts` currently holds 1 row and grows only on inbound
UNSUBSCRIBE replies — expected to stay in the hundreds against 2461 contacts. Scope is 2 endpoints,
1 panel, 1 grid config, 1 action cell

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status: NOT APPLICABLE — no ratified constitution.**

`.specify/memory/constitution.md` is the unmodified scaffold: every principle is still a
`[PRINCIPLE_N_NAME]` / `[PRINCIPLE_N_DESCRIPTION]` placeholder, and the version, ratification and
amendment dates are unfilled tokens. There are no gates to evaluate, so this check can be neither
passed nor failed — it is vacuous, and recording it as "PASS" would misrepresent it.

In place of constitutional gates, this plan holds itself to the conventions actually evidenced in
the codebase:

| Self-imposed gate | Status |
|---|---|
| Reuse existing components over new ones | PASS — `SlideMenu`, `CustomDataGrid`, `AlertProvider`, `dbService._getAll` |
| No new runtime dependencies | PASS — none added |
| No schema change / migration | PASS — both tables exist as required |
| Follow the router's existing response envelope and error mapping | PASS — mirrors `/api/contacts` |
| Destructive action requires confirmation | PASS — FR-006 via `openDialog` |

**Post-Phase-1 re-check**: unchanged. The design added no dependency, no table, and no new
architectural layer.

*If the project intends real governance, `/speckit-constitution` should be run to fill the
constitution; until then this gate stays vacuous for every feature.*

## Project Structure

### Documentation (this feature)

```text
specs/006-unsubscribe-contacts-list/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output — 8 findings, all verified against app.db
├── data-model.md        # Phase 1 output — entities, join, projected read model
├── quickstart.md        # Phase 1 output — 9 validation scenarios + regression checks
├── contracts/
│   └── unsubscribe-api.md   # Phase 1 output — API + frontend contract
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
routes/
└── contact_book.js                  # MODIFY — add the two /api/unsubscribe-contacts endpoints

services/
└── dbService.js                     # UNCHANGED — _getAll/_getTotalCount/remove already suffice

public/src/components/
├── CustomDataGrid.jsx               # UNCHANGED — consumed in server-side mode
├── SlideMenu/SlideMenu.jsx          # UNCHANGED — panel container
├── Providers/AlertProvider.jsx      # UNCHANGED — confirmation dialog
└── Dashboard/WhatsApp/
    ├── WhatsApp.jsx                 # MODIFY — button, panel, state, fetch + delete handlers
    ├── WhatsAppComponentConfig.jsx  # MODIFY — add unsubscribeColumn(...) config
    ├── UnsubscribeDataGrid.tsx      # NEW — grid wrapper, mirrors ContactBookDataGrid.tsx
    └── UnsubscribeActionCell.tsx    # NEW — delete-only action cell, modelled on ActionCell.tsx
```

**Structure Decision**: Existing web-app layout — Express routes in `routes/`, shared data access
in `services/dbService.js`, React feature components under
`public/src/components/Dashboard/WhatsApp/`. The two new files sit beside their Contact Book
counterparts (`ContactBookDataGrid.tsx`, `ActionCell.tsx`) and follow the same `.tsx` convention
those newer components use. No new directories.

## Design Decisions

Full rationale in [research.md](./research.md); the load-bearing ones:

1. **Plain `ON cb.phone = uc.phone` join** (R1). The columns are INTEGER vs TEXT and match only via
   SQLite type affinity — verified working against `app.db`. This is used deliberately because it
   is the *same* comparison the live broadcast filter makes
   (`services/whatsAppSender.js:150,174`), so the panel shows exactly the exclusion set the sender
   applies. Normalising differently here would make the panel disagree with sending behaviour.
2. **Alias `uc.id AS id` and `cb.id AS contact_id`** (R3). Both tables have `id` and `phone`;
   `SELECT *` across the join lets `cb.id` overwrite `uc.id`, which would point the hard delete at
   the wrong table. This is the feature's principal data-loss risk.
3. **Count over the same join** (R4). `contact_book.phone` is not UNIQUE (0 duplicates today), so
   counting over the joined shape keeps the pager honest if that ever changes.
4. **`SlideMenu`, not `SlideModalProvider`** (R5). The request said "slideModal", but the Contact
   Book — the stated reference — uses `SlideMenu`; the slide modal is used only by
   `SurveyDataGrid`. `SlideMenu` also gets `?view=` URL sync for free.
5. **Reuse `dbService` join support** (R2), following `routes/partner_onboarding.js:243-258`.
6. **New `UnsubscribeActionCell` rather than reusing `ActionCell`** (R7), which hard-requires
   edit/blacklist/notepad/speed-dial props meaningless for an unsubscribe row.

## Resolved: Authorization on the New Endpoints

**Decision (2026-09-07): both endpoints are guarded with `authorization_middleware.authorize_admin`.**

Implementation-time tracing corrected a mistaken assumption in `research.md` R6, which framed the
choice as "`authorize_operator` or nothing":

- `authorize_operator` (`middleware/auth.js:164`) reads the **`o-usr`** cookie and requires
  `role === "operator"`. That cookie is set only by `POST /operator/login`
  (`routes/registration.js:659-680`) for the **Event Registration page** — a separate shared-password,
  6-hour session.
- The dashboard that hosts the WhatsApp Broadcast section authenticates via
  `POST /registration-config-access` (`routes/registration.js:586`), which sets the **`a-usr`**
  cookie with `role: "admin"`.

Applying `authorize_operator` would therefore have returned 401 to the dashboard and broken the
panel outright. `authorize_admin` (`middleware/auth.js:5`) is the guard that matches the caller,
and the dashboard already sends the cookie via `credentials: 'include'`.

This deliberately diverges from the unguarded sibling routes (`GET /api/contacts`,
`DELETE /api/contacts`) — in the safe direction, so a new *hard-delete* endpoint is not shipped
open. The pre-existing gap on those sibling routes remains and is still worth closing separately;
it was left alone here to avoid breaking other callers as a side effect of this feature.

**Verified**: both endpoints return `401` without the cookie and serve normally with it
(see `tasks.md` T009 / T020).

## Complexity Tracking

> No Constitution Check violations to justify — the constitution is an unfilled scaffold
> (see Constitution Check above), and the self-imposed gates all pass.

No entry required.
