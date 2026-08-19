# Implementation Plan: Twilio Template Delete & Grid Refresh

**Branch**: `002-twilio-template-delete` | **Date**: 2026-08-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-twilio-template-delete/spec.md`

## Summary

Make the already-rendered delete icon in the WhatsApp Broadcast template grid functional, gated on the template having zero send records in `twilio_template_message`, and add a Support-Center-style Refresh button above that grid.

Technical approach: two new admin-only endpoints in `routes/whatsapp_sender.js` — a usage-count lookup for the browser's pre-flight check and a `DELETE` that **re-runs the same check server-side** before calling Twilio. The service layer gets a real `deleteContentTemplate` replacing the dead `deleteContent` stub. On the client, `TwilioTemplateDataGrid.tsx` gains a confirmation dialog and a header Refresh control that re-fetches both the template list (via a new `onRefresh` prop wired to `WhatsApp.jsx`'s existing `fetchData`) and its local approval statuses.

## Technical Context

**Language/Version**: Node.js 20 (CommonJS) server; React 18 + TypeScript client via Vite

**Primary Dependencies**: Express 4, `twilio@5.13.1`, `better-sqlite3`, MUI 5 (`@mui/material`, `@mui/icons-material`), `react-icons`

**Storage**: SQLite (`app.db`) via `services/dbService.js`; templates themselves live at Twilio, not locally

**Testing**: No test runner configured (see research R8) — manual validation per `quickstart.md`, plus `node --check` and `tsc --noEmit`

**Target Platform**: Web admin dashboard, served by the same Express process

**Project Type**: Web application (Express backend + Vite/React frontend under `public/`)

**Performance Goals**: Usage check < 100 ms (indexed-scan count over ~30k rows); delete round-trip bounded by the Twilio API call

**Constraints**: Deletion is irreversible at Twilio; the usage gate must fail closed; no new dependencies

**Scale/Scope**: ~30k rows in `twilio_template_message`; template list capped at 100 by the existing `contents.list({ limit: 100 })`; 2 endpoints, 3 files changed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is **an unmodified template** — every principle is still a `[PRINCIPLE_N_NAME]` / `[PRINCIPLE_N_DESCRIPTION]` placeholder, and the governance and version fields are unfilled.

**Result**: No enforceable gates exist. This is recorded as a non-blocking finding, not a pass. Nothing in this plan can be checked against project principles until the constitution is filled in via `/speckit-constitution`.

Applied in place of formal gates, the conventions this codebase already demonstrates:

| Convention (observed) | How this plan complies |
|---|---|
| Admin endpoints live under `/api/` and inherit `authorize_admin` (`server.js:105`) | Both new endpoints are `/api/twilio/…` |
| Secrets and authorisation decisions are made server-side (`routes/twilio_credentials.js`) | The authoritative usage gate is in the DELETE handler, not the browser |
| Security-relevant actions are logged for the Server Logs section | Every delete attempt logged with admin identity, SID and outcome |
| Service layer is transport-agnostic; routes own req/res | `deleteContentTemplate(contentSid)` takes a string, returns `{ status, result }` |
| Misconfiguration and check failure fail closed | A failed count query blocks the delete |

**Post-Phase 1 re-check**: unchanged — the design introduces no new dependency, no new auth surface, and no schema change. Still no constitution to check against.

## Project Structure

### Documentation (this feature)

```text
specs/002-twilio-template-delete/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── template-delete.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
routes/
└── whatsapp_sender.js                  # MODIFY: + GET template-usage, + DELETE template

services/
└── whatsAppSender.js                   # MODIFY: replace dead deleteContent stub with
                                        #   deleteContentTemplate(contentSid); add to exports

public/src/components/Dashboard/WhatsApp/
├── TwilioTemplateDataGrid.tsx          # MODIFY: implement onDelete, confirm dialog,
                                        #   header bar with Refresh button
└── WhatsApp.jsx                        # MODIFY: pass fetchData down as onRefresh (2 call sites)
```

No new files. No schema migration.

## Design Decisions

### D1 — Two endpoints, not one

`GET /api/twilio/template-usage/:contentSid` serves the browser's pre-flight so the confirmation dialog can state the usage count before the administrator commits. `DELETE /api/twilio/template/:contentSid` repeats the count check as its first act.

The duplication is deliberate. `services/whatsAppSender.js:478` inserts a `twilio_template_message` row on every send, so a broadcast landing between the pre-flight and the confirm click would otherwise let a now-referenced template be deleted. The pre-flight is UX; the DELETE is the gate.

### D2 — Fail closed on every uncertainty

Missing or malformed `contentSid` → 400. Count query throws → 500, no Twilio call. Count > 0 → 409 with the count. Only a clean zero proceeds. There is no code path where an unknown usage state results in a deletion.

### D3 — Order of operations

Check count → call Twilio `remove()` → respond. No local writes, so there is no partial-state problem: by definition zero rows reference the SID, so nothing needs cleaning up afterwards. A Twilio failure leaves the system exactly as it was.

### D4 — Refresh wiring

`WhatsApp.jsx` already holds `fetchData` as a stable `useCallback`. It is passed to `TwilioTemplateDataGrid` as `onRefresh` at **both** render sites (`:1431` mobile, `:1442` desktop) — missing one leaves the button dead on that breakpoint. The grid's own `fetchApprovals` runs alongside it, both awaited, with the button disabled while in flight.

## Complexity Tracking

No constitutional violations to justify (no constitution). No added dependencies, no new abstractions, no schema change.

## Known Gaps Carried Forward

1. **Narrow usage gate** — `contact_book.contentSid` (1,722 non-null) and `contact_book_events.contentSid` (6,817) also reference templates and are *not* part of the gate, per the spec as given. The usage endpoint returns these counts separately so the gate can be widened without an API change. See research R3.
2. **No automated tests** — validation is manual (research R8).
3. **Blanket auth only** — `routes/whatsapp_sender.js` declares no per-route `authorize` and depends entirely on the `/api/` mount at `server.js:105`. The new routes follow suit for consistency; a future change to that mount would silently expose them.
