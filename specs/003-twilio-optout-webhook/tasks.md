---

description: "Task list for WhatsApp Opt-Out Tracking Webhook"
---

# Tasks: WhatsApp Opt-Out Tracking Webhook

**Input**: Design documents from `/specs/003-twilio-optout-webhook/`

**Prerequisites**: plan.md, spec.md

**Tests**: Not explicitly requested in the feature specification — no test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in each description

## Path Conventions

This is a single Node/Express project. Backend routes live in `routes/`, business logic in `services/`, and SQLite access goes through `services/dbService.js` (see `db.exec` table-creation pattern already used in `routes/knowledge_base.js`). The existing inbound webhook is `routes/whatsapp_sender.js` (`POST /webhooks/whatsapp`), and the single outbound send chokepoint is `services/whatsAppSender.js` (`messageSender` → `safeSendMessage` → `sendMessageToPhone`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Nothing new to initialize — this feature extends the existing Express/SQLite app. No new dependencies or scaffolding are required.

- [X] T001 Confirm `libphonenumber-js` (already used via `parsePhoneNumberFromString` in `services/whatsAppSender.js`) is available for E.164 normalization; no new dependency needed if so, otherwise add it in `package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core storage and lookup/upsert logic that every user story depends on. No user story work should begin until this phase is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Create `services/optOutService.js` with a `db.exec` bootstrap block (same IIFE pattern as `routes/knowledge_base.js`) that runs `CREATE TABLE IF NOT EXISTS whatsapp_opt_outs (id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT NOT NULL UNIQUE, keyword TEXT NOT NULL, opted_out_at INTEGER NOT NULL)` plus `CREATE INDEX IF NOT EXISTS idx_whatsapp_opt_outs_phone ON whatsapp_opt_outs (phone)`
- [X] T003 In `services/optOutService.js`, implement `normalizePhone(rawPhone)` using `parsePhoneNumberFromString` (mirroring the validation already used in `services/whatsAppSender.js`'s `safeSendMessage`) to produce a consistent E.164 string, returning `null` for unparseable input
- [X] T004 In `services/optOutService.js`, define the opt-out keyword list as a top-level constant `OPT_OUT_KEYWORDS = ["STOP", "UNSUBSCRIBE", "CANCEL"]` and a `matchOptOutKeyword(body)` function that trims and case-insensitively compares the full message body against the list, returning the matched keyword or `null`
- [X] T005 In `services/optOutService.js`, implement `recordOptOut(rawPhone, keyword)` that normalizes the phone via `normalizePhone`, then upserts into `whatsapp_opt_outs` (`INSERT ... ON CONFLICT(phone) DO UPDATE SET keyword = excluded.keyword, opted_out_at = excluded.opted_out_at`) with the current timestamp; no-ops (with a logged warning) if normalization fails
- [X] T006 In `services/optOutService.js`, implement `isOptedOut(rawPhone)` that normalizes the phone and returns a boolean by querying `whatsapp_opt_outs` for a matching row
- [X] T007 In `services/optOutService.js`, export `{ normalizePhone, matchOptOutKeyword, recordOptOut, isOptedOut, OPT_OUT_KEYWORDS }`

**Checkpoint**: Foundation ready — `services/optOutService.js` exposes storage, normalization, keyword matching, upsert, and lookup. User story implementation can now begin.

---

## Phase 3: User Story 1 - Capture an opt-out the moment it happens (Priority: P1) 🎯 MVP

**Goal**: Recognize an inbound opt-out keyword on the existing WhatsApp webhook and persist a new opt-out record for that number.

**Independent Test**: Send an inbound WhatsApp message containing "STOP" from a test number to `POST /webhooks/whatsapp`. Confirm a new row exists in `whatsapp_opt_outs` for that number within a few seconds, with the matched keyword and a timestamp.

### Implementation for User Story 1

- [X] T008 [US1] In `routes/whatsapp_sender.js`, require `optOutService` (`const { matchOptOutKeyword, recordOptOut } = require("../services/optOutService");`) near the other top-level requires
- [X] T009 [US1] In the `POST /webhooks/whatsapp` handler in `routes/whatsapp_sender.js` (around line 848), after destructuring `From`/`Body` from `req.body`, call `matchOptOutKeyword(Body)` and, when it returns a keyword, call `recordOptOut(From, keyword)` before (or alongside) the existing `dbService.create("twilio_responses", ...)` fire-and-forget call — guard with try/catch so a failure here never affects the webhook's 200 response already written
- [X] T010 [US1] Verify `Body` is destructured from `req.body` in the `POST /webhooks/whatsapp` handler (currently only `From` and `ButtonPayload` are pulled out) and add it to the destructuring in `routes/whatsapp_sender.js`
- [X] T011 [US1] Add a guard in the new opt-out check so a missing/empty `From` or `Body` in the payload skips keyword matching and opt-out recording entirely (no record created, no error thrown) — satisfies edge case for malformed payloads

**Checkpoint**: At this point, User Story 1 is fully functional and testable independently — sending "STOP" creates a queryable opt-out record.

---

## Phase 4: User Story 2 - Don't double-count repeat opt-outs (Priority: P2)

**Goal**: Repeated opt-out keywords from the same number update the existing record instead of creating duplicates.

**Independent Test**: Send "STOP" twice in a row from the same test number. Confirm only one row exists in `whatsapp_opt_outs` for that number afterward.

### Implementation for User Story 2

- [X] T012 [US2] Confirm the `UNIQUE` constraint on `phone` in the `whatsapp_opt_outs` table (T002) combined with the `ON CONFLICT(phone) DO UPDATE` upsert in `recordOptOut` (T005) already guarantees idempotency; no additional schema change needed — this task is a verification pass, not new code
- [X] T013 [US2] Add a small verification script or manual DB check step (documented in `specs/003-twilio-optout-webhook/quickstart.md`, created here) showing: call `recordOptOut` twice with the same phone/different keywords, then `SELECT COUNT(*) FROM whatsapp_opt_outs WHERE phone = ?` returns 1, and the stored `keyword`/`opted_out_at` reflect the second call

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently — opt-outs are captured and never duplicated.

---

## Phase 5: User Story 3 - Skip known opted-out numbers before sending (Priority: P3)

**Goal**: Outbound WhatsApp sends (broadcast, template, individual) check the opt-out store first and skip recipients already opted out, reporting which numbers were skipped.

**Independent Test**: Insert a test number into `whatsapp_opt_outs` directly, then trigger `messageSender` with a phone list that includes it. Confirm that number is skipped (no `sendMessageToPhone` call for it) while other numbers in the list send normally, and the skip is visible in the result/response.

### Implementation for User Story 3

- [X] T014 [US3] In `services/whatsAppSender.js`, require `isOptedOut` from `./optOutService` near the top-level requires
- [X] T015 [US3] In `safeSendMessage` inside `messageSender` (`services/whatsAppSender.js` ~line 240), after the existing phone-number validity check and before the `sendMessageToPhone` call, add an `isOptedOut(el.phone)` check that, when true, logs the skip and returns a sentinel result (e.g. `{ skipped: true, reason: "opted_out", phone: el.phone }`) instead of sending
- [X] T016 [US3] In `messageSender` (`services/whatsAppSender.js`), collect the results of all `safeSendMessage` calls (they are already being awaited/mapped per recipient) and separate them into sent vs. skipped-for-opt-out before returning/responding, so the caller can see which numbers were skipped
- [X] T017 [US3] Update the response shape returned by the `POST /api/whatsapp/send` route (`routes/whatsapp_sender.js` line 82, which calls `messageSender`) to surface the skipped-opt-out list from T016 in the JSON response

**Checkpoint**: All user stories are now independently functional — opt-outs are captured, deduplicated, and enforced on outbound sends.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Reconcile with existing docs and close out parity/reporting requirements from the spec.

- [X] T018 [P] Reconcile `specs/003-twilio-optout-webhook/plan.md` (the original informal plan, which mentioned Twilio Sync List as an alternative) with the DB-backed approach actually implemented, noting the decision in the plan's Open Questions section
- [X] T019 [P] Add a brief section to `specs/003-twilio-optout-webhook/quickstart.md` documenting how to manually verify FR-012 (keyword list parity): compare `OPT_OUT_KEYWORDS` in `services/optOutService.js` against the keyword list configured in Twilio's Advanced Opt-Out settings
- [ ] T020 Manual end-to-end validation: run through all three user stories against a real (or sandboxed) WhatsApp-enabled Messaging Service and confirm SC-001 through SC-005 from `spec.md`

---

## Phase 7: User Story 4 - View the opt-out list from the admin dashboard (Priority: P2)

**Added**: spec.md was extended after Phases 1-6 above were already implemented (see `checklists/requirements.md` "Revalidation — 2026-08-24"). This phase covers only the new admin UI work; it depends on the `whatsapp_opt_outs` table and `services/optOutService.js` from Phase 2, which already exist.

**Goal**: Staff can open a dedicated "Opt-Out List" view under the WhatsApp Broadcast tab and see every opted-out number, its matched keyword, and when it opted out — without database access.

**Independent Test**: With one or more rows in `whatsapp_opt_outs`, open `admin?tab=whatsapp-broadcast`, click "Opt-Out List", and confirm the grid shows phone/keyword/timestamp for each row, an empty state when the table is empty, and that typing a phone number into the grid's filter narrows the results.

### Implementation for User Story 4

- [X] T021 [US4] In `services/optOutService.js`, implement `listOptOuts({ pageNumber, limit, sortField, sortOrder, advancedClauses })` (same shape `dbService._QuerySqlConverter` returns — see its use in `routes/whatsapp_sender.js`'s `/api/whatsapp/twilio-response-logs` handler) that runs an allowlisted-sort (`id`, `phone`, `keyword`, `opted_out_at`), filtered, paginated `SELECT` against `whatsapp_opt_outs` and returns `{ data, total }`
- [X] T022 [US4] Export `listOptOuts` from `services/optOutService.js`'s `module.exports`
- [X] T023 [US4] In `routes/whatsapp_sender.js`, extend the existing `require("../services/optOutService")` line to also pull in `listOptOuts`
- [X] T024 [US4] In `routes/whatsapp_sender.js`, add `router.get("/api/whatsapp/optout-list", ...)` that calls `dbService._QuerySqlConverter(req.query, "whatsapp_opt_outs")`, passes the result into `listOptOuts`, formats `opted_out_at` via the existing `toUAE` helper (same conversion already applied to `received_at` in `/api/whatsapp/twilio-response-logs`), and responds `{ status: true, data, total }`; no new auth check needed since it inherits the blanket `authorize_admin` middleware already applied to all `/api/` routes in `server.js:105` (satisfies FR-016)
- [X] T025 [US4] Create `public/src/components/Dashboard/WhatsApp/OptOutListPanel.jsx`, modeled directly on `EventLogsPanel.jsx`: a self-contained component accepting an `active` prop, with its own `paginationModel` (`{ page: 0, pageSize: 25 }`)/`sortModel` (`[{ field: 'opted_out_at', sort: 'desc' }]`)/`filterItems` state (400ms-debounced, same pattern as `EventLogsPanel.jsx`'s `buildFilterParams`), fetching `GET /api/whatsapp/optout-list` only while `active` is true, and rendering a `CustomDataGrid` (from `../../CustomDataGrid`) with columns Phone (`phone`), Keyword (`keyword`), and Opted Out At (`opted_out_at`)
- [X] T026 [US4] In `OptOutListPanel.jsx`, render a clear empty-state message (e.g. "No opted-out numbers yet") when `rowCount === 0 && !loading`, satisfying FR-014
- [X] T027 [US4] In `public/src/components/Dashboard/WhatsApp/WhatsApp.jsx`, import `OptOutListPanel` and add a new `SlideMenu` block (`id="optout-list"`, `isOpen={openPanel === 'optout-list'}`, `onClose={() => handleSetOpenPanel(null)}`, `headerTitle="Opt-Out List"`) rendering `<OptOutListPanel active={openPanel === 'optout-list'} />`, placed near the other self-contained panels (e.g. beside the `event-logs` `SlideMenu` block)
- [X] T028 [US4] In `WhatsApp.jsx`, add an "Opt-Out List" `Button` next to Response Logs / Delivery Logs / Event Logs under the "Logs" section (~line 1348), calling `handleSetOpenPanel('optout-list')` (an `MdPersonOff`-style icon from `react-icons/md`, matching the other `Md*` icons already imported, fits thematically)
- [X] T029 [US4] In `WhatsApp.jsx`'s `panelMap` (~line 907-923), add `"optout-list": "optout-list"` so the `?view=optout-list` deep link (used elsewhere for Knowledge Base jump links) opens this panel too

**Checkpoint**: Staff can view, search, and page through the opt-out list from the WhatsApp Broadcast tab; the existing backend enforcement (US1-3) is unaffected.

---

## Phase 8: Polish for User Story 4

- [X] T030 [P] Add a "US4 — View the opt-out list in the dashboard" section to `specs/003-twilio-optout-webhook/quickstart.md`: open `admin?tab=whatsapp-broadcast` → Opt-Out List, confirm rows/empty state/search behave as described in spec.md's US4 acceptance scenarios
- [ ] T031 Manual validation: confirm SC-006 and SC-007 from `spec.md` (a staff member can find a number's opt-out status in under 30 seconds via the dashboard; the list loads in under 3 seconds for up to 1,000 rows) — requires a populated `whatsapp_opt_outs` table and a person driving the UI, so it's left for manual sign-off rather than automated here

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (US1/US2/US3 all call into `services/optOutService.js`)
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 and US3 touch different call sites (`routes/whatsapp_sender.js` webhook vs. `services/whatsAppSender.js` send path) and can proceed in parallel
  - US2 has no new code of its own — it depends on Foundational's upsert logic (T002/T005) and is really a verification pass, so it can happen any time after Phase 2
- **Polish (Phase 6)**: Depends on User Stories 1-3 being complete
- **User Story 4 (Phase 7)**: Depends on Foundational (Phase 2) only — `services/optOutService.js` and the `whatsapp_opt_outs` table already exist, so this phase can start independently of Phases 3-6 (US1-3 and their Polish); it was added to the spec after those phases were already implemented
- **Polish for US4 (Phase 8)**: Depends on Phase 7 being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependency on US2/US3
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — verifies behavior already provided by Foundational; benefits from US1 existing so there's a real code path to exercise, but has no code dependency on it
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) — no dependency on US1/US2's code, though testing it meaningfully benefits from US1 being in place to populate real opt-out records
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) — no code dependency on US1/US2/US3; testing it meaningfully benefits from US1 (and a manually-seeded row from US2/US3's verification steps) so there's real data to display

### Within Each User Story

- Foundational service functions before route/service integration
- Core implementation before response-shape/reporting changes
- Story complete before moving to next priority

### Parallel Opportunities

- T008–T011 (US1) and T014–T017 (US3) touch different files (`routes/whatsapp_sender.js` webhook handler vs. `services/whatsAppSender.js` send path) and can be worked in parallel once Phase 2 is done
- T018 and T019 (Polish) are independent documentation tasks and can run in parallel
- T021–T024 (US4 backend) and T025–T026 (US4 frontend component) touch different files and can be worked in parallel once Phase 2 is done, though T027–T029 (wiring the component into `WhatsApp.jsx`) need T025 done first

---

## Parallel Example: Post-Foundational

```bash
# Once Phase 2 (T002-T007) is complete, these can run in parallel:
Task: "US1 — wire opt-out capture into routes/whatsapp_sender.js webhook handler (T008-T011)"
Task: "US3 — wire opt-out skip check into services/whatsAppSender.js send path (T014-T017)"
Task: "US4 — build the /api/whatsapp/optout-list endpoint (T021-T024)"
Task: "US4 — build OptOutListPanel.jsx (T025-T026), then wire it into WhatsApp.jsx (T027-T029)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002-T007) — CRITICAL, blocks all stories
3. Complete Phase 3: User Story 1 (T008-T011)
4. **STOP and VALIDATE**: Send "STOP" from a test WhatsApp number, confirm a row appears in `whatsapp_opt_outs`
5. Deploy/demo if ready — this alone satisfies the original problem statement (we now have our own record of opt-outs)

### Incremental Delivery

1. Setup + Foundational → opt-out storage and matching logic ready
2. Add User Story 1 → capture works → validate → deploy (MVP!)
3. Add User Story 2 → verify no duplicates → validate → deploy
4. Add User Story 3 → outbound sends respect opt-outs → validate → deploy
5. Polish → reconcile docs, run full acceptance pass against spec.md's Success Criteria
6. Add User Story 4 → admin UI opt-out list ships on top of the already-deployed backend → validate against SC-006/SC-007 → deploy

---

## Notes

- No test tasks were generated — the feature spec did not request tests or a TDD approach; add them under each story's phase if that changes.
- All opt-out logic is centralized in `services/optOutService.js` so both the inbound webhook (US1) and outbound send path (US3) share one source of truth.
- Avoid: matching opt-out keywords as substrings (spec explicitly requires exact, trimmed, case-insensitive match — see FR-002 and the Edge Cases section of spec.md).
- Phases 7-8 (US4) were appended once User Story 4 was added to spec.md, after Phases 1-6 were already implemented; `listOptOuts` in `services/optOutService.js` keeps all `whatsapp_opt_outs` table access in one file rather than embedding SQL directly in the route, unlike the older `twilio_responses`/`twilio_delivery` log endpoints in `routes/whatsapp_sender.js`.
- US4 is read-only by design (see spec.md's Assumptions) — no remove/re-permit action is in scope for `OptOutListPanel.jsx`.
