---
description: "Task list for Twilio Template Delete & Grid Refresh"
---

# Tasks: Twilio Template Delete & Grid Refresh

**Input**: Design documents from `/specs/002-twilio-template-delete/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/template-delete.md](./contracts/template-delete.md), [quickstart.md](./quickstart.md)

**Tests**: No test tasks are generated. Tests were not requested in the spec, and research R8 established that this repo has no test runner, no `tests/` directory, and no test script. Validation is manual per `quickstart.md`, plus `node --check` and `tsc --noEmit`. Introducing a test framework is a larger change than this feature and is out of scope.

**Organization**: Tasks are grouped by user story. Note the deviation from the usual MVP rule in [Implementation Strategy](#implementation-strategy) — US1 and US2 are both P1 and must ship together.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in every task

## Path Conventions

Web application (per plan.md): Express backend at the repository root (`routes/`, `services/`), Vite/React frontend under `public/src/`. No new files are created by this feature — all tasks modify existing ones.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the baseline needed to validate the work later

- [X] T001 Record the pre-change baseline count by running `node -e 'console.log(require("better-sqlite3")("app.db",{readonly:true}).prepare("SELECT COUNT(*) c FROM twilio_template_message").get())'` from the repo root and noting the value in the PR description; `quickstart.md` cleanup asserts this number is unchanged (expected `29853` as of 2026-08-19)
- [X] T002 [P] Confirm `twilio@5.13.1` exposes content deletion by running `node -e 'console.log(typeof require("twilio")(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN).content.v1.contents("HX0").remove)'` — must print `function` (per research R2)
- [ ] T003 [P] Create a disposable Twilio template named `zz_delete_me_20260819` through the existing Create Template flow in the WhatsApp Broadcast section and record its content SID; every delete scenario in `quickstart.md` uses this template and never a real one

**Checkpoint**: A safe delete target exists and the SDK capability is confirmed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared building blocks both P1 stories depend on — the usage-count query, the SID validator, the Twilio delete call, and the advisory usage endpoint

**⚠️ CRITICAL**: No delete behaviour may be wired up until T004–T008 are complete. The gate must exist before the trigger.

- [X] T004 Replace the dead `deleteContent(req, res)` stub at `services/whatsAppSender.js:573` with `deleteContentTemplate(contentSid)` that calls `twilioClient.content.v1.contents(contentSid).remove()`, resolves `{ status: true, result: true }` on success and `{ status: false, result: error }` on failure, and never throws — matching the shape `fetchContentTemplates` already returns (contracts §3, research R2)
- [X] T005 Add `deleteContentTemplate` to the `module.exports` block at the bottom of `services/whatsAppSender.js` (the old `deleteContent` stub was never exported; do not export it)
- [X] T006 [P] Add a module-level `isValidContentSid(value)` helper in `routes/whatsapp_sender.js` testing `typeof value === "string" && /^HX[0-9a-fA-F]{32}$/.test(value)`, used by both new endpoints (data-model validation rules)
- [X] T007 [P] Add a module-level `countTemplateSends(contentSid)` helper in `routes/whatsapp_sender.js` running `SELECT COUNT(*) AS c FROM twilio_template_message WHERE contentSid = ?` via the same `db` handle the file already uses; it must let query errors propagate so callers can fail closed rather than reading a false zero (data-model; use the live table name, **not** the stale `twilio_template_message_new` in `create_tables.sql:77`)
- [X] T008 Implement `GET /api/twilio/template-usage/:contentSid` in `routes/whatsapp_sender.js` returning `{ status, contentSid, sendCount, canDelete, related: { contactBook, contactBookEvents } }` per contracts §1, where `canDelete` is `sendCount === 0` and `related` counts come from `contact_book.contentSid` and `contact_book_events.contentSid` as advisory-only values that do **not** affect `canDelete` (research R3); `400` on invalid SID, `500` if any count query throws

**Checkpoint**: The usage gate is queryable and the Twilio delete call exists, but nothing can trigger a deletion yet

---

## Phase 3: User Story 1 - Delete a template that was never used (Priority: P1) 🎯 MVP

**Goal**: An administrator can permanently remove an unused template from the Twilio content library without leaving the WhatsApp Broadcast section.

**Independent Test**: Create a throwaway template, never broadcast it, delete it from the grid, and confirm it is gone from both the grid and the Twilio console (`quickstart.md` Scenario 2).

**⚠️ Do not ship this phase without Phase 4.** See [Implementation Strategy](#implementation-strategy).

### Implementation for User Story 1

- [X] T009 [US1] Implement `DELETE /api/twilio/template/:contentSid` in `routes/whatsapp_sender.js` following the normative handler order in contracts §2: validate SID → `countTemplateSends` → `deleteContentTemplate` → respond `{ status: true, contentSid, message: "Template deleted" }`; the success path is this task, the refusal paths are T016–T018
- [X] T010 [US1] ⚠️ *Partial — `name=` omitted, see completion notes.* Add the `GRANTED` audit line to the delete handler in `routes/whatsapp_sender.js` in the format `${Date.now()} - [TemplateDelete] GRANTED — deleted. sid=… name=… admin=… ip=…`, resolving admin identity as `req.user?.username || req.user?.email || req.user?.role || "unknown-admin"` exactly as `routes/twilio_credentials.js:71` does (contracts §logging, FR-013)
- [X] T011 [P] [US1] Add a confirmation `Dialog` to `public/src/components/Dashboard/WhatsApp/TwilioTemplateDataGrid.tsx` holding the pending row and its usage result, naming the template via `friendlyName` and warning that deletion is permanent, with Cancel and a destructive-styled Delete action; use MUI `Dialog`, never `window.confirm` (research R6, FR-005)
- [X] T012 [US1] Replace the inert `const onDelete = (row: FlatRow) => { console.log(row) }` in `public/src/components/Dashboard/WhatsApp/TwilioTemplateDataGrid.tsx` with a handler that fetches `GET /api/twilio/template-usage/:sid` with `credentials: 'include'` and opens the T011 dialog only when `canDelete` is true; keep the existing `TbTrashX` icon button, tooltip and error styling untouched (research R1, FR-001/FR-002)
- [X] T013 [US1] Implement the dialog's confirm action in `public/src/components/Dashboard/WhatsApp/TwilioTemplateDataGrid.tsx` to issue `DELETE /api/twilio/template/:sid` with `credentials: 'include'`, disable both dialog buttons while the request is in flight, and close the dialog on completion
- [X] T014 [US1] On a successful delete in `public/src/components/Dashboard/WhatsApp/TwilioTemplateDataGrid.tsx`, call the `onRefresh` prop, remove the deleted SID from the local `approvals` state, and clear `selectedRow` plus close the preview panel when the deleted row was the selected one (research R7, FR-011)
- [X] T015 [US1] Report delete outcomes through the existing snackbar by threading `showSnackbar` into the grid — either as a prop from `public/src/components/Dashboard/WhatsApp/WhatsApp.jsx` (which already holds it via `useSnackbar()` at `:146`) or by calling `useSnackbar()` directly in `TwilioTemplateDataGrid.tsx`; success and every failure code must produce a message (FR-012)

**Checkpoint**: An unused template can be deleted end to end — but the server will still delete a used one until Phase 4 lands

---

## Phase 4: User Story 2 - Be stopped from deleting a template that has been sent (Priority: P1)

**Goal**: A template with send history can never be deleted, whether the attempt comes from the UI or directly from the API.

**Independent Test**: Pick any content SID present in `twilio_template_message`, attempt deletion from the UI *and* via a direct `fetch` bypassing the UI, and confirm both are refused and the template still exists at Twilio (`quickstart.md` Scenario 1).

**This is the safety half of the same action as US1, not a follow-up enhancement.**

### Implementation for User Story 2

- [X] T016 [US2] Add the authoritative gate to the `DELETE /api/twilio/template/:contentSid` handler in `routes/whatsapp_sender.js`: when `countTemplateSends` returns greater than zero, respond `409` with `{ status: false, sendCount, message }` and **never** call Twilio — this re-check must run on every request regardless of what the pre-flight returned, because `services/whatsAppSender.js:478` inserts a send row between the browser's check and the confirm click (plan D1, research R4, FR-004)
- [X] T017 [US2] Make the delete handler in `routes/whatsapp_sender.js` fail closed: a throwing count query returns `500` with no Twilio call, and an invalid SID returns `400` with no Twilio call; there must be no code path where an unknown usage state results in a deletion (plan D2, FR-008)
- [X] T018 [US2] Map Twilio failures in the delete handler in `routes/whatsapp_sender.js` to `404` when Twilio reports the content does not exist and `502` for any other rejection or unreachability, per contracts §2
- [X] T019 [P] [US2] Add the `DENIED`/`ERROR` audit lines to the delete handler in `routes/whatsapp_sender.js` — `console.warn` for in-use denials and `console.error` for usage-check and Twilio failures, in the exact formats tabulated in contracts §logging so they surface in the dashboard's Server Logs section (FR-013)
- [X] T020 [US2] Make the client block before confirming in `public/src/components/Dashboard/WhatsApp/TwilioTemplateDataGrid.tsx`: when the pre-flight returns `canDelete: false`, show a snackbar naming the send count and do **not** open the dialog; treat a non-`200` pre-flight response or a network failure the same way — blocked, never permissive (FR-003, FR-008, spec US2 scenarios 1–2)
- [X] T021 [US2] Handle a `409` from the DELETE in `public/src/components/Dashboard/WhatsApp/TwilioTemplateDataGrid.tsx` by closing the dialog, reporting the server-supplied `sendCount` in a snackbar, and calling `onRefresh` — this is the race where a broadcast landed after the pre-flight passed (spec US2 scenario 3)

**Checkpoint**: Both P1 stories are complete. Deletion works for unused templates and is impossible for used ones. **This is the shippable unit.**

---

## Phase 5: User Story 3 - Refresh the template grid in place (Priority: P2)

**Goal**: An administrator can re-fetch the template list and approval statuses without reloading the dashboard.

**Independent Test**: Create or delete a template in a second browser tab, activate Refresh, and confirm the grid reflects the change (`quickstart.md` Scenario 4).

### Implementation for User Story 3

- [X] T022 [US3] Add an `onRefresh?: () => void | Promise<void>` prop to the `TwilioTemplateDataGridProps` interface in `public/src/components/Dashboard/WhatsApp/TwilioTemplateDataGrid.tsx` (contracts §client-side)
- [X] T023 [US3] Pass the existing `fetchData` callback as `onRefresh` at **both** `TwilioTemplateDataGrid` render sites in `public/src/components/Dashboard/WhatsApp/WhatsApp.jsx` — line ~1431 (mobile) and line ~1442 (desktop); passing it at only one leaves Refresh dead on that breakpoint (plan D4)
- [X] T024 [US3] Add a header bar above `CustomDataGrid` in `public/src/components/Dashboard/WhatsApp/TwilioTemplateDataGrid.tsx` containing a Refresh `Button` styled to match `public/src/components/Dashboard/Support/SupportSection.jsx:113-119` — `size="small"`, `startIcon={<RefreshIcon />}` from `@mui/icons-material/Refresh`, `sx={{ textTransform: 'none' }}` (FR-009, research R5)
- [X] T025 [US3] Wire the Refresh button in `public/src/components/Dashboard/WhatsApp/TwilioTemplateDataGrid.tsx` to await `onRefresh()` and the existing local `fetchApprovals()` together, guarded by a `refreshing` state flag that disables the button while in flight so double-clicks cannot issue duplicate fetches (FR-010, spec US3 scenario 2)
- [X] T026 [US3] Handle refresh failure in `public/src/components/Dashboard/WhatsApp/TwilioTemplateDataGrid.tsx` so the previously loaded rows stay visible and the error is reported via snackbar — the grid must not blank out (spec US3 scenario 3)
- [X] T027 [US3] Verify the header bar does not break the existing `height: "calc(100vh - 150px)"` container in `public/src/components/Dashboard/WhatsApp/TwilioTemplateDataGrid.tsx`, adjusting the offset so the grid does not overflow or gain a second scrollbar at mobile and desktop widths

**Checkpoint**: All three stories are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T028 [P] Run `node --check routes/whatsapp_sender.js` and `node --check services/whatsAppSender.js`; both must pass
- [X] T029 [P] ⚠️ *Substituted — no tsconfig.json exists in this repo; validated with esbuild parse + full `npm run build` instead.* Run `npx tsc --noEmit` against the frontend tsconfig covering `public/src/` and confirm `TwilioTemplateDataGrid.tsx` reports no new type errors
- [ ] T030 Work through every scenario in [quickstart.md](./quickstart.md) — Scenario 1 (used template refused, including the direct-`fetch` bypass) must pass before this feature ships
- [X] T031 Confirm `twilio_template_message` still holds the T001 baseline count; this feature must never delete from that table
- [ ] T032 [P] Delete any leftover `zz_delete_me_*` templates from Twilio and revert the temporary table rename used in `quickstart.md` Scenario 3
- [X] T033 [P] Add a short comment above the delete handler in `routes/whatsapp_sender.js` explaining why the usage check is duplicated between the pre-flight and the handler, so a future reader does not "simplify" the race protection away (plan D1)
- [ ] T034 Raise the narrow-gate risk from research R3 with the product owner: `contact_book.contentSid` (1,722 non-null rows) and `contact_book_events.contentSid` (6,817 rows) also reference templates and are deliberately outside the gate, so a template can pass and still leave dangling references; the `related` counts are already in the usage response, so widening the gate needs no contract change

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**
- **US1 (Phase 3)** and **US2 (Phase 4)**: Both depend on Phase 2. They touch the same handler and must be delivered together
- **US3 (Phase 5)**: Depends on Phase 2 only. Independent of US1/US2 except that T014's `onRefresh` call needs T022–T023 to have any effect
- **Polish (Phase 6)**: Depends on all shipped stories

### Critical Path

```text
T004,T005 ─┐
T006,T007 ─┼─> T008 ─> T009 ─> T016,T017,T018 ─> T030
           │            │
           └────────────┴─> T012 ─> T013 ─> T014 ─> T020,T021
```

### Within Each User Story

- Server-side helpers before endpoints; endpoints before client wiring
- T009 (success path) must land before T016–T018 (refusal paths) — same handler, sequential edits
- T022–T023 (prop plumbing) before T025 (button behaviour)

### Cross-Story Note

T014 calls `onRefresh`, which is introduced by T022/T023 in US3. Make the prop optional (`onRefresh?`) so US1 remains independently testable if US3 has not landed — the grid then simply does not auto-refresh after a delete.

### Parallel Opportunities

- **Phase 1**: T002 and T003 in parallel
- **Phase 2**: T006 and T007 in parallel (both `routes/whatsapp_sender.js` but independent helpers — coordinate to avoid edit collisions); T004/T005 in `services/whatsAppSender.js` run in parallel with them
- **Phase 3**: T011 (dialog component) in parallel with T009/T010 (server) — different files
- **Phase 4**: T019 (logging) in parallel with T020 (client blocking)
- **Phase 5**: server work is done, so all of US3 can proceed alongside Phase 4 by a second person
- **Phase 6**: T028, T029, T032, T033 in parallel

### Parallel Example: Phase 2

```bash
# Different files — safe to run together:
Task: "Replace the deleteContent stub with deleteContentTemplate in services/whatsAppSender.js"   # T004
Task: "Add isValidContentSid helper in routes/whatsapp_sender.js"                                  # T006
Task: "Add countTemplateSends helper in routes/whatsapp_sender.js"                                 # T007
```

---

## Implementation Strategy

### MVP scope — a deliberate deviation

The usual rule is "MVP = User Story 1". **That is wrong here.** US1 and US2 are both P1 and are the two halves of one action: US1 is the delete, US2 is the gate that makes deleting safe. Shipping Phase 3 without Phase 4 produces a server endpoint that will happily delete a template with 29,853 rows of send history behind it, silently and permanently degrading the delivery logs, response logs and insight views (data-model, research R3).

**MVP = Phase 1 + Phase 2 + Phase 3 + Phase 4.** Phase 5 (Refresh) is the genuinely optional increment.

### Incremental delivery

1. Phases 1–2 → gate is queryable, nothing can delete yet
2. Phases 3–4 → **ship this**; validate with `quickstart.md` Scenarios 1, 2, 3, 5, 6
3. Phase 5 → ship Refresh; validate with Scenario 4
4. Phase 6 → polish, and put T034's narrow-gate question in front of the product owner

### Suggested parallel staffing

With two people after Phase 2: one takes the server handler (T009, T010, T016–T019), the other takes the client (T011–T015, T020, T021) and then all of US3. The `onRefresh?` optional prop keeps the two tracks from blocking each other.
