---

description: "Task list for 016 — Partner employee list sync reliability fixes"
---

# Tasks: Partner employee list sync — reliability fixes

**Input**: Design documents from `/specs/016-fix-partner-sync/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: No automated test tasks. The spec does not request them, and the repo has no test runner. Each story ends with a manual check task that points to its [quickstart.md](./quickstart.md) scenario.

**Organization**: Tasks are grouped by user story. The sync engine in `routes/member_card.js` is shared by US1–US4, so its per-row skeleton is built in Phase 2, and each story then adds its own branch logic.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: The user story the task belongs to (US1–US7 from spec.md)

## Path Conventions

This is a web app, and all paths are relative to the repo root:
- Backend: `routes/`, `helpers/`, `services/`, SQL at the root
- Frontend: `public/src/components/`

---

## Phase 1: Setup

- [X] T001 Create the git branch `016-fix-partner-sync` from `main`, and back up the dev database with `cp app.db backups/app-before-016.db` (restore with the reverse copy). The DB path is hard-coded in `services/dbService.js:4`.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Shared helpers, the schema change, and the per-row sync skeleton that every story builds on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Add `normalizePhone(raw)` to `helpers/essentials.js` and export it. Rules (data-model.md §5):
  1. `String(raw ?? '').trim()`.
  2. Keep digits only (`replace(/\D/g, '')`).
  3. If the result starts with `00`, drop those two characters.
  4. Return the result (`''` when empty).

  `'+971 50-123 4567'`, `'00971501234567'` and `'971501234567'` must all return `'971501234567'`.
- [X] T003 Add `parseBirthday(raw)` to `helpers/essentials.js` and export it (same file as T002, so sequential).
  - Accept `D/M/YYYY` and `DD/MM/YYYY` (`/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/`), and `YYYY-MM-DD` with an optional time suffix (`/^(\d{4})-(\d{2})-(\d{2})/`).
  - Validate that it is a real calendar date by building `new Date(Date.UTC(y, m-1, d))` and checking the parts round-trip. The year must be between 1900 and the current year.
  - Return a zero-padded `YYYY-MM-DD`, or `null` for anything else, including empty input.
- [X] T004 [P] Update the `partner_onboarding_data` DDL in `create_tables.sql`:
  - Fix the stray `;` after the `action_type` CHECK on line 298.
  - Add `sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending','synchronized','superseded','not_found','conflict','already_active'))`, `synced_at DATETIME` and `sync_note TEXT`.
  - After the table, add `CREATE UNIQUE INDEX IF NOT EXISTS ux_pod_pending_partner_phone ON partner_onboarding_data (LOWER(TRIM(partner)), mobile_number) WHERE synchronized = 0;`.
- [X] T005 [P] Create the one-off script `migrate_partner_onboarding_sync_status.sql` at the repo root, styled like `backfill_app_support_email_log.sql` (header comment explaining why). Statements, in order:
  1. `ALTER TABLE partner_onboarding_data ADD COLUMN …` for the three columns from T004.
  2. `UPDATE … SET sync_status='synchronized', sync_note='closed before 016', synced_at=COALESCE(synced_at, metadata_createdAt) WHERE synchronized = 1`.
  3. Normalize pending phones: `UPDATE … SET mobile_number = <nested REPLACE of '+',' ','-','(',')','.'> WHERE synchronized = 0`, then a second `UPDATE` that strips a leading `00` (`substr(mobile_number,3)` where `mobile_number LIKE '00%'`).
  4. Supersede older pending duplicates. Rank with `ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(partner)), mobile_number ORDER BY metadata_createdAt DESC, id DESC)`, then set rows with rn > 1 to `synchronized=1, sync_status='superseded', sync_note='duplicate closed by 016 migration', synced_at=datetime('now')`.
  5. `CREATE UNIQUE INDEX IF NOT EXISTS ux_pod_pending_partner_phone …` (same as T004).

  Wrap steps 2–5 in `BEGIN; … COMMIT;`.
- [X] T006 Run `sqlite3 app.db < migrate_partner_onboarding_sync_status.sql` on the dev DB (depends on T005), then run the three audit queries from quickstart.md. Expected:
  - Every row has a `sync_status`.
  - No pending duplicates.
  - No non-digit pending phones.
- [X] T007 Rebuild the sync skeleton in `POST /api/member-card-sync` in `routes/member_card.js` (depends on T002 and T006). Keep the request validation, the single `db.transaction` and the umlaut-folded Step 0 query.
  - **Step 0 query**: return **all** pending rows (`synchronized != 1`) of the partner and language, with `rn` from the existing `ROW_NUMBER()`. Do not filter to `rn = 1`. Keep the 1-month window for now; T034 removes it.
  - **`closeRow`**: add a prepared statement `UPDATE partner_onboarding_data SET synchronized = 1, sync_status = ?, synced_at = datetime('now'), sync_note = ? WHERE id = ?`.
  - **`foldPartner(str)`**: add a JS helper that mirrors the SQL folding (lower, trim, `ü/Ü→u`, `ö/Ö→o`, `ä/Ä→a`, `ß→ss`).
  - **Counters**: `{ inserted, updated, moved, deactivated, superseded, not_found, conflict, already_active }`, plus arrays `moves = []` and `conflicts = []`.
  - **Losers**: rows with `rn > 1` → `closeRow('superseded', 'older pending row for same phone', id)` and `superseded++`.
  - **Per row** (`rn = 1`): `const phone = normalizePhone(r.mobile_number)`. Load the cards with `SELECT * FROM member_card WHERE mobile_number = ? ORDER BY active DESC, id DESC`. Split them into `same` (`foldPartner(card.partner) === foldPartner(r.partner)`) and `others`.
  - **Dispatch** by `action_type` to three branch functions: `applyUpdate`, `applyDelete`, `applyAdd`.
    - `applyUpdate`: `same[0]` → UPDATE by `id` (current field set and gender mapping; `active = 1`; `remarks = 'synchronized ' || datetime('now')`), then `closeRow('synchronized')`. Otherwise `others[0]` → `conflict`, with `conflicts.push({ mobile_number: phone, action: 'update', owner_partner })`. Otherwise `not_found`.
    - `applyDelete`: the same three-way logic, with the soft-delete UPDATE by id.
    - `applyAdd`, initial version:
      - Run the existing 3-month guard (`already_active` when it matches).
      - `same[0]` → the existing `updateMcAddStmt` rewritten as `WHERE id = ?` → `updated`.
      - `others[0]` → `conflict` (placeholder; T020 changes it to a move).
      - Otherwise → the existing insert with card-number generation → `inserted`.
  - **Remove** the old "STEP 4" bulk `UPDATE partner_onboarding_data SET synchronized = 1 …`. Every row is now closed by `closeRow`.
  - **Response**: `res.json({ status: true, ...counters, moves, conflicts })`. This keeps `updated`, `inserted` and `deactivated` for the current snackbars.

**Checkpoint**: Syncing the dev DB returns the new response shape. Rows of the other language stay `synchronized = 0`.

---

## Phase 3: User Story 1 — New members receive their invitation after a sync (Priority: P1) 🎯 MVP

**Goal**: Every card a sync creates triggers exactly one invitation. A failed email never stops the others (FR-001–FR-004).

**Independent Test**: quickstart.md Scenario 1. Sync 3 new adds → `invitations_queued: 3`, and 3 invitation rows appear in `email_log`.

- [X] T008 [P] [US1] Harden `sendBatchEmails` in `services/emailService.js`:
  - Start with `const list = Array.from(corporateCardEmailSet ?? [])`.
  - Chunk `list` with `chunkArray`.
  - Replace `Promise.all` with `Promise.allSettled`. For each `rejected` result, call `dbService.create("error_log", { error: \`${reason} (to: ${batch[i]?.email})\`, origin_function: "sendBatchEmails" })` and continue.
  - Keep the 25-per-batch size and the 10 s delay, and skip the delay after the last batch.
  - Keep the outer try/catch.
- [X] T009 [US1] In `applyAdd` in `routes/member_card.js`, after a successful insert, re-read the card with `SELECT * FROM member_card WHERE id = ?` (`info.lastInsertRowid`) and push it to a `createdCards` array. This replaces `corporateCardEmailSet`.
  - After `sync()` returns, if `createdCards.length`, call `sendBatchEmails(createdCards).catch(err => console.error(...))` **without await**.
  - Add `invitations_queued: createdCards.length` to the response.
  - Delete the old `corporateCardEmailSet` `Set`.
- [X] T010 [P] [US1] Create `public/src/components/Sections/syncSummary.js`, exporting `formatSyncSummary(partner, d, langLabel)`. It returns a one-line string:
  - `Synced "<partner>" (<lang>): X inserted, Y updated, Z deactivated, N invitations queued`.
  - Then append `, M moved`, `, K not found`, `, C conflicts`, `, A already active` and `, S superseded`, each only when non-zero.
- [X] T011 [US1] Use `formatSyncSummary` in the success snackbars of `handleSync` in `public/src/components/Sections/MemberCardDataGrid.jsx` (label `EN`) and `public/src/components/Sections/DeliveryTrackingSection.jsx` (label `DE`), replacing the hand-built strings.
- [ ] T012 [US1] Run quickstart.md Scenario 1, including the forced-failure step. Confirm one `error_log` row and that the remaining invitations were sent. **Partly done:** the e2e harness confirmed `invitations_queued: 3` and that the sender receives an array of 3 created cards (email stubbed). Still open: a real-transport run with one rejected address, to see the `error_log` row.

**Checkpoint**: The MVP. New members get invitations again.

---

## Phase 4: User Story 2 — Update and delete rows reach the right card (Priority: P1)

**Goal**: Phones are stored and matched in one standard format. Unmatched rows are reported as "not found" (FR-005–FR-009).

**Independent Test**: quickstart.md Scenario 2. An update for `+971 50-123 4567` updates card `971501234567`, a delete for `00971501234567` deactivates it, and an unknown phone gives `not_found: 1`.

- [X] T013 [US2] In `insertMany` in `routes/partner_onboarding.js`:
  - Import `normalizePhone` from `../helpers/essentials`.
  - Compute `const mobile = normalizePhone(r["normalized 🔒"] || r["mobile number"])`.
  - Pass `mobile` to `insertContact` instead of `r["mobile number"]`.
  - When `mobile === ''`, skip the row and count it in a new `invalid` counter.
  - Return `{ inserted, invalid }` from the transaction, and add `invalid` to the `/upload-csv` JSON response.
- [X] T014 [US2] Confirm that `applyUpdate`, `applyDelete` and `applyAdd` in `routes/member_card.js` all use the T007 `phone` variable, including the 3-month guard parameters and the insert's `mobile_number`. Remove the leftover `r.mobile_number.replace('+','')` and every remaining use of the raw `r.mobile_number` in card statements.
- [X] T015 [US2] Run quickstart.md Scenario 2 (all 5 steps) and the "no non-digit pending phones" audit query.

**Checkpoint**: Leavers are actually deactivated, and unmatched rows are visible.

---

## Phase 5: User Story 3 — German-speaking employees get their own sync (Priority: P1)

**Goal**: The EN sync never touches DE rows, and the reverse. The admin sees pending counts per language (FR-010–FR-012b).

**Independent Test**: quickstart.md Scenario 3. Corporate Member shows `EN 2 · DE 2`. Sync leaves both DE rows pending. Sync (DE) creates 2 type-5 cards, and the button then disables.

- [X] T016 [US3] In `routes/member_card.js`, extend both stats queries with per-language counts:
  - `GET /api/member-card-partner-stats`: in the `pod` CTE, add `COUNT(*) FILTER (WHERE lower(trim(language)) = 'en') AS pending_en` and the same for `'de'` as `pending_de`. Select `COALESCE(pod.pending_en,0) AS pending_en` and `COALESCE(pod.pending_de,0) AS pending_de`.
  - `GET /api/partner-onboarding-pending-counts`: add the same two counts next to `pending_count`.
- [X] T017 [US3] In `public/src/components/Sections/MemberCardDataGrid.jsx`:
  - Change `fetchPendingCounts` to store objects `{ total: pending_count, en: pending_en, de: pending_de }` per partner key.
  - Update `rightTableRows` to read `_pendingCount` from `.total` and add `_pendingEn` from `.en`.
  - Right-table Sync button: show it only when `row._notInServices && row._pendingEn > 0`.
  - Left table `available_update` column: render `EN {pending_en} · DE {pending_de}`, or `-` when both are 0.
  - Left-table Sync button: show it only when `row.pending_en > 0`.
- [X] T018 [US3] In `public/src/components/Sections/DeliveryTrackingSection.jsx`, store the pending-count objects the same way as T017, and keep `_pendingCount` = `.total` for the existing list. Disable the "Sync (DE)" button when the selected partner's `.de` count is 0, giving it a `title` tooltip "No pending German-speaking employees".
- [X] T019 [US3] Run quickstart.md Scenario 3.

**Checkpoint**: German rows are never closed by the EN sync.

---

## Phase 6: User Story 4 — A member who changes jobs moves to the new partner (Priority: P2)

**Goal**: A cross-partner add moves the card. A cross-partner update or delete is a conflict. Uploads can only stage rows for the logged-in partner (FR-013–FR-015, research D6–D7).

**Independent Test**: quickstart.md Scenario 4. Partner B's add for Partner A's phone moves the card (number and serial kept, remarks record the move). Partner B's delete for Partner C's phone gives `conflict: 1`. A tampered form `partner` is ignored.

- [X] T020 [US4] Replace the placeholder `others[0]` branch of `applyAdd` in `routes/member_card.js` with a move:
  - Run `UPDATE member_card SET partner = ?, firstname = ?, lastname = ?, title = ?, gender = CASE ? WHEN 'm' THEN 'Herr' WHEN 'f' THEN 'Frau' ELSE gender END, email = ?, birthday = ?, type = CASE ? WHEN 'de' THEN 5 ELSE 7 END, active = 1, card_expiry_date = datetime('now','+1 year'), remarks = ?, metadata_modifiedAt = datetime('now') WHERE id = ?` on `others[0].id`. Set `remarks` to `` `moved from ${others[0].partner} to ${r.partner} ` + new Date().toISOString() ``. Leave `card_number`, `serial_number`, `google_pass_token` and `memberId` untouched.
  - Then `moved++`, `moves.push({ mobile_number: phone, from_partner: others[0].partner })` and `closeRow('synchronized', 'moved from ' + others[0].partner, r.id)`.
- [X] T021 [US4] Make the 3-month guard in `applyAdd` in `routes/member_card.js` partner-scoped:
  - Change `checkActiveGuard` so that it requires the active `member_card` row **and** the earlier synchronized `partner_onboarding_data` row to belong to the syncing partner. Use the same folded-partner comparison, `pod2.sync_status = 'synchronized'` and `metadata_createdAt >= datetime('now','-3 months')`.
  - On a match: `closeRow('already_active', null, r.id)` and `already_active++`.
- [X] T022 [US4] In `POST /upload-csv` in `routes/partner_onboarding.js`:
  - Decode `req.cookies["partner-usr"]` with `jwt.verify(token, process.env.JWT_SECRET)`, as `/partner-auto-login` does, and set `const partner = decoded?.partner?.title`.
  - Return 401 `{ status: false, message: "Partner session has no partner" }` when it is missing.
  - Ignore `req.body.partner`, and pass the JWT value to `insertMany` and the `partner_delivery_info` upsert.
- [X] T023 [P] [US4] In `MemberCardDataGrid.jsx` and `DeliveryTrackingSection.jsx` (`public/src/components/Sections/`): when the sync response has `moves.length` or `conflicts.length`, open the existing `openDialog` (`useAlertDialog`) after the snackbar. List each move as `<phone> — moved from <from_partner>` and each conflict as `<phone> — <action> blocked, owned by <owner_partner>`. Check that `DeliveryTrackingSection.jsx` already imports `useAlertDialog`, and add the import if it doesn't.
- [X] T024 [US4] Run quickstart.md Scenario 4 (all 5 steps).

**Checkpoint**: No card ends up with one partner's details while owned by another.

---

## Phase 7: User Story 5 — Birthdays from the employee list are kept (Priority: P2)

**Goal**: Birthdays survive upload and sync in `YYYY-MM-DD` format. Unreadable dates are warned about, not rejected, and an empty date never wipes a card (FR-016–FR-018).

**Independent Test**: quickstart.md Scenario 5. Four rows (Excel date, `25/09/1995`, `1995-09-25`, `soon`) give 1 wizard warning and staged `1995-09-25` ×3 plus `NULL` ×1. An update with an empty birthday keeps the card's birthday.

- [X] T025 [P] [US5] In `public/src/components/PartnerOnboarding/validateAndConvertXlsx.tsx`:
  - Add `formatDateCell(v)`, which returns `YYYY-MM-DD` from `getUTCFullYear()`, `getUTCMonth()+1` and `getUTCDate()` when `v instanceof Date`.
  - In the `recordData` builder, check for a `Date` first. Formula cells need the same treatment: use `formatDateCell` when `cell.result instanceof Date`. Then the existing `.result` fallback, then `cellToString`.
  - After building `recordData["Date of Birth"]`, if it is non-empty and matches none of `^\d{1,2}/\d{1,2}/\d{4}$` or `^\d{4}-\d{2}-\d{2}`, push `{ rowNumber, reasons: ['"Date of Birth" is not a readable date and will be left empty'] }` to a new `warnings` array. Keep the row valid.
  - Add `warnings?: FaultyRecord[]` to `XlsxValidationResult`, and return `warnings`.
- [X] T026 [US5] In `public/src/components/PartnerOnboarding/PartnerOnboarding.tsx`:
  - Add `warnings: null` to the wizard state.
  - Store `result.warnings` in `handleFileDrop`, and reset it wherever `faultyRecords` is reset.
  - In `StepReview`, add an info card "Warnings" with the count. When the count is > 0, list each warning's row number and reason under the cards, styled like the existing faulty-row display.
- [X] T027 [US5] In `insertMany` in `routes/partner_onboarding.js`:
  - Replace the inline birthday regex block with `const birthday = parseBirthday(r["date of birth"])`, importing it from `../helpers/essentials`.
  - Pass `birthday` instead of `r["date of birth"]` to `insertContact`.
- [X] T028 [US5] In `routes/member_card.js`:
  - In the `applyUpdate`, `applyAdd` (same-partner) and move UPDATE statements, change `birthday = ?` to `birthday = COALESCE(?, birthday)`, and pass `r.birthday || null`.
  - Pass `r.birthday || null` to the insert as well.
- [X] T029 [US5] Run quickstart.md Scenario 5.

**Checkpoint**: Birthdays reach member cards.

---

## Phase 8: User Story 6 — Re-uploads don't pile up duplicates (Priority: P3)

**Goal**: There is one pending row per employee per partner. Upload reports new, replaced and unchanged counts, and replaced rows are recorded as superseded (FR-019–FR-020).

**Independent Test**: quickstart.md Scenario 6. 10 rows → `inserted: 10`. The same file again → `unchanged: 10` with the pending count still 10. One row edited → `replaced: 1, unchanged: 9`, and the old row is `superseded`.

- [X] T030 [US6] In `routes/partner_onboarding.js`:
  - Change `insertContact` from `INSERT OR IGNORE` to a plain `INSERT`.
  - Add the prepared statements:
    - `findPending`: `SELECT * FROM partner_onboarding_data WHERE LOWER(TRIM(partner)) = LOWER(TRIM(?)) AND mobile_number = ? AND synchronized = 0 LIMIT 1`.
    - `supersedePending`: `UPDATE partner_onboarding_data SET synchronized = 1, sync_status = 'superseded', synced_at = datetime('now'), sync_note = 'replaced by upload ' || datetime('now') WHERE id = ?`.
  - In `insertMany`, for each row:
    - When `findPending` matches and all of `title`, `firstname`, `lastname`, `gender`, `email`, `birthday`, `language` and `action_type` are equal (compare `?? ''`), increment `unchanged` and continue.
    - When it matches but differs, run `supersedePending(existing.id)`, insert, and increment `replaced`.
    - Otherwise insert and increment `inserted`.
  - Return `{ inserted, replaced, unchanged, invalid }`.
- [X] T031 [US6] Update the `/upload-csv` response in `routes/partner_onboarding.js` to match contracts/upload-csv.md: `{ status, message, total, inserted, replaced, unchanged, skipped: unchanged, invalid }`.
- [X] T032 [US6] In `handleSubmitCSV` in `public/src/components/PartnerOnboarding/PartnerOnboarding.tsx`, read the JSON on success and show `Onboarding submitted — X new, Y updated, Z unchanged` in the success snackbar, in place of the static second `SUCCESS_TOAST_MESSAGES` entry.
- [X] T033 [US6] Run quickstart.md Scenario 6 and the "at most one pending row per employee" audit query.

**Checkpoint**: Pending counts reflect real changes.

---

## Phase 9: User Story 7 — Pending changes don't silently expire (Priority: P3)

**Goal**: Pending rows have no age limit. Partners with rows older than 30 days are flagged, showing the oldest date (FR-022, FR-022a).

**Independent Test**: quickstart.md Scenario 7. A row back-dated by 40 days is counted, flagged "> 30 days" with its date, and applied by Sync. The flag then disappears.

- [X] T034 [US7] In `routes/member_card.js`, remove `metadata_createdAt >= datetime('now','-1 month')` from:
  - the sync Step 0 `unsynced_table` CTE,
  - the `pod` CTE of `/api/member-card-partner-stats`,
  - `/api/partner-onboarding-pending-counts`.

  Leave the 3-month guard in `applyAdd` as it is.
- [X] T035 [US7] In `routes/member_card.js`, add `MIN(metadata_createdAt) AS oldest_pending` to the `pod` CTE (selected as `pod.oldest_pending`) of `/api/member-card-partner-stats` and to `/api/partner-onboarding-pending-counts`.
- [X] T036 [US7] In `public/src/components/Sections/MemberCardDataGrid.jsx`, in the left table's `available_update` render: when `row.oldest_pending` is more than 30 days before now (parse the SQLite text as UTC by replacing the space with `T` and appending `Z`), append a small MUI `Chip` with `label="> 30 days"`, `color="warning"`, `size="small"`, inside a `Tooltip` titled `Oldest pending: <YYYY-MM-DD>`. Check that `Tooltip` is imported.
- [X] T037 [US7] Run quickstart.md Scenario 7.

**Checkpoint**: No pending change disappears from view.

---

## Phase 10: Polish & cross-cutting concerns

- [X] T038 [P] Update `PARTNER_ONBOARDING_WORKFLOW.md` (FR-025):
  - **§1 diagram**: make the step-4 node "Close each row by id with its outcome", and add the "Sync (DE)" path from Delivery Tracking.
  - **§3.3**: document partner-from-JWT, the normalized phone and birthday, replace/unchanged dedup, and the new response counts.
  - **§4.1**: correct the statement about `language: 'en'` (the DE sync exists in Delivery Tracking).
  - **§4.2**: rewrite to the per-row outcome table from research.md D7, including moves and the partner-scoped guard.
  - **§5**: add `sync_status`, `synced_at` and `sync_note`.
  - **§7**: convert to a "Resolved in 016" table, one row per issue with its fix.
- [X] T039 [P] Remove the stray `debugger;` statement in `fetchPartnerStats` in `public/src/components/Sections/MemberCardDataGrid.jsx`.
- [X] T040 Check the pure helpers with `node -e "const h=require('./helpers/essentials'); console.log(h.normalizePhone('+971 50-123 4567'), h.normalizePhone('00971501234567'), h.parseBirthday('25/9/1995'), h.parseBirthday('1995-09-25 00:00'), h.parseBirthday('31/02/1995'), h.parseBirthday('soon'))"`. Expected: `971501234567 971501234567 1995-09-25 1995-09-25 null null`.
- [X] T041 Run the quickstart.md "Idempotency" check (Sync twice → all counts 0) and the "Audit queries" section. Then build the frontend with `cd public && npm run build` and confirm it compiles with no new errors.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup. It blocks every story. Internal order: T002 → T003 (same file); T004 ∥ T005 → T006; then T007 (needs T002 and T006).
- **US1 (Phase 3)**: after Phase 2. 🎯 MVP.
- **US2 (Phase 4)**: after Phase 2. T014 edits the same sync function as T009, so do it after T009 when working alone.
- **US3 (Phase 5)**: after Phase 2. T017 and T018 build on T011 (same components), so do them after T011.
- **US4 (Phase 6)**: after Phase 2. T020 and T021 edit `applyAdd` after T009 and T014. T022 edits `/upload-csv` after T013.
- **US5 (Phase 7)**: after Phase 2. T027 is after T013 (same function). T028 is after T020 (it touches the move UPDATE).
- **US6 (Phase 8)**: after T013 and T027 (same `insertMany`), and after T022 (same route).
- **US7 (Phase 9)**: after T016 (same queries). T036 is after T017 (same column render).
- **Polish (Phase 10)**: after all stories.

### Shared-file hot spots (no [P] across these)

| File | Tasks |
|---|---|
| `routes/member_card.js` | T007, T009, T014, T016, T020, T021, T028, T034, T035 |
| `routes/partner_onboarding.js` | T013, T022, T027, T030, T031 |
| `MemberCardDataGrid.jsx` | T011, T017, T023, T036, T039 |
| `DeliveryTrackingSection.jsx` | T011, T018, T023 |

### Parallel opportunities

- T004 ∥ T005: two different SQL files.
- After Phase 2:
  - T008 (`emailService.js`), T010 (new `syncSummary.js`), T025 (`validateAndConvertXlsx.tsx`) and T038 (doc draft) touch disjoint files and can run alongside the backend work.
  - T026 (`PartnerOnboarding.tsx`) can run alongside any backend task.

---

## Parallel Example: after Phase 2

```text
Task: "T008 [US1] Harden sendBatchEmails in services/emailService.js"
Task: "T010 [US1] Create formatSyncSummary in public/src/components/Sections/syncSummary.js"
Task: "T025 [US5] Date cells + warnings in public/src/components/PartnerOnboarding/validateAndConvertXlsx.tsx"
```

---

## Implementation Strategy

### MVP first (User Story 1)

1. Phase 1 → Phase 2. The per-row engine alone already fixes issue 2 (language leak) and issue 3 (silent supersede).
2. Phase 3 (US1). New members get invitations again.
3. **Stop and validate** with Scenario 1. This set can ship on its own.

### Incremental delivery

1. Phases 1–3 (MVP): invitations + per-row engine.
2. + US2 (phones) + US3 (language UI). All P1 issues are closed.
3. + US4 (moves, JWT partner) + US5 (birthdays). The P2 issues are closed.
4. + US6 (re-uploads) + US7 (no expiry). The P3 issues are closed.
5. Polish: docs, helper checks, idempotency, build.

Run the migration (T005/T006) on production **before** deploying the code that writes `sync_status`. The new code would fail on a database without the columns.
