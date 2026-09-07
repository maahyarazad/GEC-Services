---
description: "Task list for the Unsubscribed Contacts Panel"
---

# Tasks: Unsubscribed Contacts Panel

**Input**: Design documents from `/specs/006-unsubscribe-contacts-list/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/unsubscribe-api.md`, `quickstart.md`

**Tests**: **No automated test tasks are generated.** The spec does not request TDD, and this repo
has no test framework configured — `package.json` defines the default `"test": "echo \"Error: no
test specified\" && exit 1"` stub, and there is no `tests/` directory. Verification is therefore
the manual scenario suite in `quickstart.md`, plus direct `better-sqlite3` assertions against
`app.db`. Validation tasks below reference those scenarios by number.

**Organization**: Tasks are grouped by user story. See the honest dependency note under
"User Story Dependencies" — US2 is a UI increment on top of US1's grid and is not fully
independent of it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)
- Exact file paths are included in every task

## Path Conventions

Web application, single repo (per `plan.md` → Structure Decision):

- Backend: `routes/`, `services/` at repository root
- Frontend: `public/src/components/`
- Database: `app.db` (SQLite) at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Resolve the one open decision and create the data needed to exercise both stories.

- [X] T001 Confirm the authorization decision recorded in `specs/006-unsubscribe-contacts-list/research.md` R6 before writing endpoints: either apply `authorization_middleware.authorize_operator` to the new routes in `routes/contact_book.js`, or match the unguarded convention of `GET /api/contacts` (line 225) and `DELETE /api/contacts` (line 152). Record the answer in `plan.md` under "Open Question for the User". This gates T006 and T017.
- [ ] T002 [P] Seed both join cases into `app.db` using the script in `specs/006-unsubscribe-contacts-list/quickstart.md` → "Seed test data": one `unsubscribe_contacts` row whose phone exists in `contact_book`, and one (`+491700000000`) that does not. Insert `+`-prefixed strings so SQLite coerces them exactly as production does. **[BLOCKED]** — `app.db` is write-locked by DB Browser for SQLite (PID 696) holding an open transaction. Not force-unlocked: that risks discarding uncommitted work. No writes were made. Run this after committing/closing that session.
- [X] T003 [P] Verify the baseline join before writing any code by running the query in `specs/006-unsubscribe-contacts-list/research.md` R3 against `app.db`; confirm the unmatched seeded row returns with `contact_id: null` and every `cb.*` field null.

**Checkpoint**: The open decision is settled and both join cases exist in the dev database.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared column-projection contract that BOTH endpoints depend on. This phase
exists because of `research.md` R3 — `unsubscribe_contacts` and `contact_book` both declare `id`
and `phone`, and getting the aliasing wrong points the hard delete at the wrong table.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 In `routes/contact_book.js`, add a clearly delimited "Unsubscribe contacts" section below the existing contact routes, declaring two module-scoped constants: `UNSUBSCRIBE_LEFT_JOIN = { table: "contact_book AS cb", on: "cb.phone = uc.phone" }` and `UNSUBSCRIBE_COLUMNS` listing `uc.id AS id`, `uc.phone AS phone`, `uc.created_at`, `cb.id AS contact_id`, `cb.title`, `cb.first_name`, `cb.last_name`, `cb.gender`, `cb.language`, `cb.type`, `cb.club_partner_name`, `cb.blacklist` — exactly as specified in `specs/006-unsubscribe-contacts-list/contracts/unsubscribe-api.md`.
- [X] T005 Add a comment above `UNSUBSCRIBE_COLUMNS` in `routes/contact_book.js` stating that `uc.id AS id` and `cb.id AS contact_id` must never be collapsed into `SELECT *` or `uc.*`, citing FR-009 — this aliasing is the guard against deleting the wrong table's row.

**Checkpoint**: The projection contract is defined once and both endpoints can reference it.

---

## Phase 3: User Story 1 - View who has unsubscribed (Priority: P1) 🎯 MVP

**Goal**: An operator clicks a new **Unsubscribed** button in the WhatsApp Broadcast "Manage Data"
group and sees every `unsubscribe_contacts` row, enriched from `contact_book` via LEFT JOIN, in a
`CustomDataGrid` inside a `SlideMenu` panel — with unmatched rows still listed.

**Independent Test**: Run `quickstart.md` Scenarios 1–4 and 9. The panel opens at
`?view=unsubscribed`, lists both seeded rows, shows the matched row's name/type/language, shows the
unmatched row with a "No matching contact" indicator, responds to server-side paging/sorting/
filtering, and renders an empty state when the table is emptied. No delete capability is needed
for any of this.

### Backend for User Story 1

- [X] T006 [US1] Implement `GET /api/unsubscribe-contacts` in `routes/contact_book.js` per `contracts/unsubscribe-api.md`: call `dbService._QuerySqlConverter(req.query, "unsubscribe_contacts AS uc")`, then `dbService._getAll("unsubscribe_contacts AS uc", filters, { columns: UNSUBSCRIBE_COLUMNS, leftJoin: UNSUBSCRIBE_LEFT_JOIN, advancedClauses, jsonFilters, sortField: sortField || "uc.id", sortOrder: sortOrder || "desc", pageNumber, limit })`. Follow the shape of the existing precedent at `routes/partner_onboarding.js:243-258`. Apply the T001 authorization decision.
- [X] T007 [US1] In the same handler in `routes/contact_book.js`, compute the total with `dbService._getTotalCount("unsubscribe_contacts AS uc", filters, baseAdvancedClauses, UNSUBSCRIBE_LEFT_JOIN)` — passing the **same** `leftJoin` so the pager cannot disagree with the rendered rows (`research.md` R4).
- [X] T008 [US1] Return the envelope `{ status: true, data, total, page: pageNumber + 1, pageSize: limit }` from the handler in `routes/contact_book.js`, matching `GET /api/contacts` (line 306-312), and wrap the handler in try/catch that logs with the `${Date.now()} - ` prefix used throughout the file and responds `500 { status: false, message: "Failed to fetch unsubscribe contacts" }`.
- [X] T009 [US1] Verify the endpoint independently of the UI by curling `/api/unsubscribe-contacts?page=1&pageSize=25` per `quickstart.md` Scenario 2, confirming the matched row has a non-null `contact_id` and that `phone` is an unquoted JSON number without a `+`.

### Frontend for User Story 1

- [X] T010 [P] [US1] Create `public/src/components/Dashboard/WhatsApp/UnsubscribeDataGrid.tsx` as a thin wrapper over `CustomDataGrid` in server-side mode, modelled on `ContactBookDataGrid.tsx:60-75` (`filterMode`/`sortingMode`/`paginationMode` = `"server"`, `rowCount`, `paginationModel`, `onPaginationModelChange`, `sortModel`, `onSortModelChange`, `filterItems`, `onFilterItemsChange`, `showToolbar`, `rowsPerPageOptions: [25, 50, 100]`, `loading`), wrapped in the same `Box` height styling. Import the default export as `React.ComponentType<Record<string, any>>` the way `ContactBookDataGrid.tsx:5-6` does.
- [X] T011 [P] [US1] Add `export const unsubscribeColumn = ({ onDeleteUnsubscribe }) => [...]` to `public/src/components/Dashboard/WhatsApp/WhatsAppComponentConfig.jsx`, following the shape of `contactBookColumn` (line 286). Include the columns listed in `contracts/unsubscribe-api.md` → "Grid columns": `phone` (rendered as `+${params.row.phone}`), a derived `name`, `type`, `language`, `club_partner_name`, `created_at`. Leave the actions column out — it is added in US2 (T018).
- [X] T012 [US1] In the `name` column's `renderCell` in `WhatsAppComponentConfig.jsx`, join `title`/`first_name`/`last_name` and trim, and when `params.row.contact_id` is `null` render a visibly distinct "No matching contact" indicator instead. Do not assume `first_name` exists — it is `NOT NULL` on `contact_book` but arrives `null` through the LEFT JOIN (`data-model.md` → Projected read model).
- [X] T013 [US1] Add the grid state to `public/src/components/Dashboard/WhatsApp/WhatsApp.jsx` beside the contact-book state (lines 111-117): `unsubscribeList`, `unsubscribeRowCount`, `unsubscribePaginationModel` (`{ page: 0, pageSize: 25 }`), `unsubscribeSortModel` (`[{ field: 'created_at', sort: 'desc' }]`), `unsubscribeFilterItems`, `debouncedUnsubscribeFilterItems`, and an `unsubscribeFilterSentRef`.
- [X] T014 [US1] Add `fetchUnsubscribeData` to `public/src/components/Dashboard/WhatsApp/WhatsApp.jsx`, modelled on `fetchContactData` (line 194): build query params with the existing in-file `buildContactFilterParams` helper (line 182), `fetch` `${import.meta.env.VITE_SERVERURL}/api/unsubscribe-contacts?...` with `credentials: 'include'`, then `setUnsubscribeList(response_data.data)` and `setUnsubscribeRowCount(response_data.total)`.
- [X] T015 [US1] Add two effects to `public/src/components/Dashboard/WhatsApp/WhatsApp.jsx`: a 400ms filter-debounce effect reusing the in-file `getEffectiveFilterKey` helper (line 262), mirroring the contact-book debounce at lines 278-289; and a fetch effect that runs `fetchUnsubscribeData` only when `openPanel === 'unsubscribed'`, mirroring lines 291-295.
- [X] T016 [US1] Wire the panel and its trigger in `public/src/components/Dashboard/WhatsApp/WhatsApp.jsx`: add a `<SlideMenu id={'unsubscribed'} isOpen={openPanel === 'unsubscribed'} onClose={() => handleSetOpenPanel(null)} headerTitle={'Unsubscribed Contacts'}>` block containing `<UnsubscribeDataGrid />`, following the `contact-book` panel at lines 1174-1222; and add an **Unsubscribed** `Button` to the "Manage Data" group after the Event List button (line 1336-1338) calling `handleSetOpenPanel('unsubscribed')`, styled `variant="outlined" color="primary"` with `sx={{ textTransform: 'none', justifyContent: 'flex-start' }}` to match its siblings.
- [ ] T017 [US1] Validate User Story 1 end to end by running `quickstart.md` Scenarios 1, 2, 3, 4 and 9. Scenario 3 is the load-bearing one — the unmatched row must appear; if it is missing, the join has become an INNER JOIN. **[NOT RUN]** — requires the dev server + browser. Backend half verified over HTTP (see T009). Scenario 3 (unmatched row) could not be exercised against live data: all 28 current unsubscribe rows match a contact, and seeding is blocked by T002. The LEFT JOIN semantics were instead proven with a synthetic-row query returning `contact_id: null` and every `cb.*` field null.

**Checkpoint**: The panel is fully functional as a read-only view and can be demoed as the MVP.

---

## Phase 4: User Story 2 - Remove someone from the unsubscribe list (Priority: P2)

**Goal**: An operator clicks a delete icon in the grid's actions column, confirms in the standard
dialog, and the row is hard-deleted from `unsubscribe_contacts`, returning that phone to the
broadcast audience.

**Independent Test**: Run `quickstart.md` Scenarios 5, 6, 7 and 8. Cancelling deletes nothing;
confirming removes the row and decrements `total`; `contact_book` is untouched; a repeat delete
returns 404 not 500; and the broadcast exclusion count drops by one.

**Depends on**: US1 (T010-T016) — this story adds an actions column to the grid US1 creates.

### Backend for User Story 2

- [X] T018 [P] [US2] Implement `DELETE /api/unsubscribe-contacts` in `routes/contact_book.js` per `contracts/unsubscribe-api.md`, modelled on `DELETE /api/contacts` (line 152-177): read `{ id }` from `req.body`, reject missing/non-numeric with `400 { status: false, message: "ID is required" }`, call `dbService.remove("unsubscribe_contacts", id)`, map `changes === 0` to `404 { status: false, message: "Unsubscribe record not found" }`, and return `200 { status: true, message: "Unsubscribe record deleted successfully" }`. Apply the T001 authorization decision.
- [X] T019 [US2] Add a try/catch to the delete handler in `routes/contact_book.js` logging with the `${Date.now()} - ` prefix and responding `500 { status: false, message: "Failed to delete unsubscribe record" }`, matching the surrounding handlers.
- [X] T020 [US2] Verify the endpoint independently of the UI per `quickstart.md` Scenario 7: a `DELETE` with a non-existent id returns HTTP 404 with the documented body, not a 500.

### Frontend for User Story 2

- [X] T021 [P] [US2] Create `public/src/components/Dashboard/WhatsApp/UnsubscribeActionCell.tsx` exposing only a delete action — `TbTrashX` from `react-icons/tb` at size 22 inside an MUI `IconButton` with `sx={{ color: "#d32f2f", "&:hover": { backgroundColor: "#ffebee" } }}`, wrapped in a `Tooltip title="Remove from Unsubscribe List"` — matching the delete button in `ActionCell.tsx:66-74`. Props: `{ params, onDeleteUnsubscribe }`. Do not reuse `ActionCell` itself; it hard-requires `onModifyContact`, `onSwitchBlacklist`, notepad and `EventSpeedDial` props that are meaningless here (`research.md` R7).
- [X] T022 [US2] Add the actions column to `unsubscribeColumn` in `public/src/components/Dashboard/WhatsApp/WhatsAppComponentConfig.jsx`: `{ field: '_', headerName: 'Actions', width: 100, sortable: false, filterable: false, renderCell: (params) => <UnsubscribeActionCell params={params} onDeleteUnsubscribe={onDeleteUnsubscribe} /> }`, following the actions column in `contactBookColumn` (line 310+).
- [X] T023 [US2] Add `deleteUnsubscribe(id)` to `public/src/components/Dashboard/WhatsApp/WhatsApp.jsx`, modelled on `deleteContact` (line 368-400): `fetch` `${import.meta.env.VITE_SERVERURL}/api/unsubscribe-contacts` with `method: 'DELETE'`, `credentials: 'include'`, `'Content-Type': 'application/json'` and body `JSON.stringify({ id })`; on a non-ok response call `showSnackbar(responseData.message, "error")`; then re-run `fetchUnsubscribeData` with the current pagination/sort/filter state.
- [X] T024 [US2] Add `onDeleteUnsubscribe(row)` to `public/src/components/Dashboard/WhatsApp/WhatsApp.jsx`, modelled on `onDeleteContact` (line 402-419): call `openDialog` with a body stating the removal is permanent **and that the person will start receiving broadcasts again**, title `'Remove from Unsubscribe List'`, action `{ text: 'Remove', color: 'error' }`, and `() => { deleteUnsubscribe(row.id); }` as the confirm callback. Pass `row.id`, never `row.contact_id` (FR-009).
- [X] T025 [US2] Pass `onDeleteUnsubscribe` from `WhatsApp.jsx` through `UnsubscribeDataGrid.tsx` into `unsubscribeColumn(...)`, following how `ContactBookDataGrid.tsx:58` assembles `columnProps` and passes them to `contactBookColumn`.
- [ ] T026 [US2] Validate User Story 2 end to end by running `quickstart.md` Scenarios 5, 6, 7 and 8. Scenario 6 is the load-bearing one — after deleting the **matched** row, the `contact_book` record at that `contact_id` must still exist; if it does not, the T004/T005 aliasing has regressed. **[NOT RUN — deliberately]** — requires deleting a real row. `unsubscribe_contacts` holds 28 genuine opt-outs; deleting one would return a real person to the broadcast audience. Left for you to run against a seeded throwaway row once T002 is unblocked. The 404 and 400 paths were verified instead (T020).

**Checkpoint**: Both stories are functional. The panel lists and reverses unsubscribes.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T027 [P] Run the regression checks in `specs/006-unsubscribe-contacts-list/quickstart.md` → "Regression checks": the Contact Book panel still opens/pages/filters/deletes, `DELETE /api/contacts` is unaffected, the other `SlideMenu` panels still open, opening the new panel closes the previous one, and `?view=` deep-linking still works. **[NOT RUN]** — manual browser regression pass.
- [ ] T028 [P] Confirm the new panel renders correctly on mobile — `SlideMenu` switches layout below 768px (`SlideMenu.jsx:19-25`) and `CustomDataGrid` hides some controls under the `sm` breakpoint; check the actions column stays reachable. **[NOT RUN]** — manual mobile check.
- [X] T029 Re-read the final `routes/contact_book.js` diff and confirm no handler uses `SELECT *` or `uc.*` across the join, and that `dbService.remove` is only ever called with `"unsubscribe_contacts"` in the new code.
- [X] T030 Update `specs/006-unsubscribe-contacts-list/plan.md` to record the resolved authorization decision from T001, replacing the "Open Question for the User" section with the outcome.
- [X] T031 File the schema-normalisation follow-up described in `specs/006-unsubscribe-contacts-list/research.md` R1 (make `unsubscribe_contacts.phone` TEXT, backfill the `+` prefix, normalise the writer at `services/whatsAppSender.js:867`) as a separate feature. It is deliberately out of scope here and must not be bundled into this change.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T001 gates T006 and T018.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS both user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational. No dependency on US2.
- **User Story 2 (Phase 4)**: Depends on Foundational **and** on US1's grid existing.
- **Polish (Phase 5)**: Depends on both stories.

### User Story Dependencies

- **US1 (P1)**: Independent once Phase 2 completes. Fully demoable alone — this is the MVP.
- **US2 (P2)**: **Not fully independent.** Its backend (T018-T020) can be built and verified by
  curl in parallel with US1, but its frontend (T021-T026) adds an actions column to the grid that
  US1 creates, so it cannot be demoed without US1. The spec states this explicitly under
  User Story 2 → "Why this priority". Do not plan US2 as a parallel track for a second developer
  expecting an independent demo.

### Within Each User Story

- Backend before frontend (the frontend fetch has nothing to call otherwise).
- Column config (T011) before the grid wrapper consumes it (T016).
- State (T013) before the fetch that sets it (T014) before the effects that call it (T015).
- Handlers (T023, T024) before the wiring that passes them down (T025).

### Parallel Opportunities

- **Phase 1**: T002 and T003 are `[P]` (T003 reads what T002 writes — run T002 first, then T003 is
  independent of everything else).
- **Phase 3**: T010 and T011 are `[P]` — different files (`UnsubscribeDataGrid.tsx` vs
  `WhatsAppComponentConfig.jsx`). T013-T016 all edit `WhatsApp.jsx` and must be sequential.
- **Phase 4**: T018 (`routes/contact_book.js`) and T021 (`UnsubscribeActionCell.tsx`) are `[P]` —
  different files, and the backend can be curl-verified before any UI exists. T023-T025 all edit
  `WhatsApp.jsx` and must be sequential.
- **Phase 5**: T027 and T028 are `[P]`.
- **Cross-phase**: T018-T020 (US2 backend) may run in parallel with all of Phase 3 once Phase 2 is
  done, since they touch only `routes/contact_book.js` sections that US1 does not.

---

## Parallel Example: User Story 1

```bash
# After Phase 2 completes, launch the two independent frontend files together:
Task: "Create UnsubscribeDataGrid.tsx wrapper over CustomDataGrid in public/src/components/Dashboard/WhatsApp/UnsubscribeDataGrid.tsx"
Task: "Add unsubscribeColumn config to public/src/components/Dashboard/WhatsApp/WhatsAppComponentConfig.jsx"

# NOT parallelizable — all four edit the same file (WhatsApp.jsx):
#   T013 state → T014 fetch → T015 effects → T016 panel + button
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup — settle the auth question (T001), seed both join cases (T002-T003).
2. Phase 2: Foundational — the aliased projection contract (T004-T005). **Blocks everything.**
3. Phase 3: User Story 1 — GET endpoint, panel, grid.
4. **STOP and VALIDATE**: `quickstart.md` Scenarios 1-4 and 9.
5. Demo. The operator can now see the unsubscribe list without opening SQLite (SC-001), including
   unmatched rows (SC-002) — real value delivered with no destructive capability shipped yet.

### Incremental Delivery

1. Setup + Foundational → projection contract locked.
2. US1 → read-only panel → **MVP, safe to ship**.
3. US2 → delete action → ship after Scenario 6 passes (the wrong-row-deletion guard).
4. Polish → regressions, mobile, follow-up filed.

Shipping US1 alone is a genuinely useful and non-destructive increment. Resist merging US2 until
Scenario 6 has actually been run against real data — it is the only check that catches the
`uc.id` / `cb.id` aliasing failure, and that failure deletes the wrong person's contact record.

### Parallel Team Strategy

With two developers, after Phase 2:

- Developer A: US1 backend (T006-T009), then US1 frontend (T010-T017).
- Developer B: US2 backend (T018-T020) in parallel, curl-verified — then **waits** for A's grid
  before starting T021-T026.

US2's frontend cannot proceed independently; see "User Story Dependencies" above.

---

## Notes

- `[P]` = different files, no dependencies on incomplete tasks.
- Every task touching `public/src/components/Dashboard/WhatsApp/WhatsApp.jsx` is sequential —
  it is a single 1491-line file and the contact-book, guest-list and logs panels all live in it.
- No test tasks: no framework is configured in this repo. Validation is `quickstart.md`.
- Two tasks are load-bearing safety checks rather than features: **T017** (Scenario 3, the LEFT
  JOIN) and **T026** (Scenario 6, the delete-key aliasing). Do not skip them.
- Commit after each task or logical group.
