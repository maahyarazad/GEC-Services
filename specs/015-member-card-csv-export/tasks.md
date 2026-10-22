# Tasks: Corporate member card CSV export — UTF-8 umlauts and complete column values

**Input**: Design documents from `/specs/015-member-card-csv-export/`

**Prerequisites**: plan.md, spec.md, research.md (decisions D1–D9), data-model.md, contracts/member-card-csv-endpoint.md, quickstart.md

**Tests**: The spec does not request automated tests (the repo has no test runner). Validation is manual, using quickstart.md scenarios.

**Organization**: Tasks are grouped by user story. Almost all edits are in `routes/member_card.js`, so tasks within a story are mostly sequential.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (a different file, no dependency on an incomplete task)
- **[Story]**: US1 = umlauts/UTF-8, US2 = all columns and values, US3 = readable headers and values

---

## Phase 1: Setup

**Purpose**: Confirm the starting point. No new dependencies are needed (`json2csv@6.0.0-alpha.2` already supports `fields`, `withBOM`, `delimiter` and `eol`).

- [X] T001 Create a feature branch `015-member-card-csv-export` from `main`, then record a baseline: run `curl -s -D- -b <admin cookie> "$SERVER/api/member-card-csv-data" -o /tmp/before.csv`, or run `node -e` against `app.db` using `services/csvParser.js`. Note the header row and the first bytes (expect no `efbbbf`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Make the shared CSV helper configurable without changing its existing caller.

- [X] T002 Change `exportTableAsCSV(rows)` to `exportTableAsCSV(rows, options = {})` in `services/csvParser.js`. Construct `new Parser(options)`. If `rows` is empty **and** `options.fields` is given, resolve with `new Parser(options).parse([])` (header row only). Otherwise keep the existing `reject('No data available to export.')`. Update the JSDoc (`@param {Object} [options]` — passed through to json2csv, e.g. `fields`, `withBOM`, `delimiter`, `eol`; `@returns` the CSV string). Research D7, D9.
- [X] T003 Confirm that `routes/member.js` (`/api/member-csv-data`) still calls `exportTableAsCSV(data)` with no options and produces byte-identical output to before T002. This is a code read plus one `node -e` comparison; make no edits to `routes/member.js`.

**Checkpoint**: The helper accepts options, and the Member export is unchanged.

---

## Phase 3: User Story 1 - Umlauts and special characters display correctly (Priority: P1) 🎯 MVP

**Goal**: Excel (opened by double-click), Google Sheets and Numbers show `ä ö ü ß ®` correctly.

**Independent Test**: Quickstart scenarios 1, 2 and the BOM/charset part of 10. Export a card with first name `Jürgen` and partner `Café Größe®`; it displays correctly in Excel.

- [X] T004 [US1] In `routes/member_card.js` `GET /api/member-card-csv-data` (around line 608), call `exportTableAsCSV(data, { withBOM: true })` and change the header to `res.setHeader("Content-Type", "text/csv; charset=utf-8")`. Research D1, contract.
- [X] T005 [US1] Check the bytes: the response starts with `EF BB BF`, the header shows `charset=utf-8`, and `Jürgen` appears as `4a c3 bc 72 67 65 6e` in `xxd` output. Quickstart scenario 10.

**Checkpoint**: The umlaut fix is shippable on its own.

---

## Phase 4: User Story 2 - Every column and value is present in the export (Priority: P1)

**Goal**: All 23 columns from data-model.md are present. These include Active, Gender, Last Login, Serial Number, Google Pass and the derived Apple Pass link. Values stay in their cells, long numbers stay intact, formula-like text is neutralised, and an empty table exports a header only. Last Login and Gender start being recorded.

**Independent Test**: Quickstart scenarios 3–8, 9 and 11. Check the header order, the pass links for a card with a serial number, aligned multi-line remarks, `971549940636` shown in full, `=1+1` shown as text, and Last Login filled after a portal login.

### Export columns

- [X] T006 [US2] In `routes/member_card.js`, near `titleToSlug`, add these helpers:
  - `const MEMBER_CARD_PASS_SLUG = titleToSlug("CORPORATE CARD")`.
  - `applePassUrl(row)` returns `${process.env.CLIENT_ORIGIN}/apple_pass/${MEMBER_CARD_PASS_SLUG}/${row.serial_number}.pkpass` when `row.serial_number` is set, otherwise `""`. Research D3.
  - `textSafeNumber(value)`: when `String(value)` matches `/^\+?\d{10,}$/`, return `="<value>"`; when the value is null, return `""`; otherwise return the value unchanged. Research D5.
  - `neutralize(value)`: when a string starts with one of `= + - @ \t \r`, prefix it with `'`; `null`/`undefined` become `""`; other values are returned unchanged. Research D5.
- [X] T007 [US2] In `routes/member_card.js`, add `MEMBER_CARD_EXPORT_FIELDS`: an array of 23 `{ label, value: (row) => … }` entries, in exactly the header order and labels of `specs/015-member-card-csv-export/data-model.md`.
  - At this stage every value is the raw column passed through `neutralize`.
  - Exceptions: Card Number, Mobile Number and Member ID use `textSafeNumber`; Apple Pass uses `applePassUrl`; Google Pass is `row.google_pass_token`, raw, through `neutralize`.
- [X] T008 [US2] In `GET /api/member-card-csv-data` (`routes/member_card.js`):
  - Replace `dbService.findAll("member_card")` with `db.prepare("SELECT * FROM member_card ORDER BY id DESC").all()`.
  - Read `req.query.delimiter`: `"semicolon"` gives `";"`, anything else gives `","`.
  - Call `exportTableAsCSV(data, { fields: MEMBER_CARD_EXPORT_FIELDS, withBOM: true, eol: "\r\n", delimiter })`.
  - Contract `contracts/member-card-csv-endpoint.md`; research D2, D6, D7.

### Recording the never-written fields (FR-003b)

- [X] T009 [US2] In `POST /member-login` (`routes/member_card.js`, around line 224), after `res.cookie(...)` and before the JSON response, add a best-effort stamp in its own `try/catch`:
  - When `member?.id && member?.email`, run `db.prepare("UPDATE member_card SET last_login = datetime('now') WHERE id = ? AND email = ?").run(member.id, member.email)`.
  - On error, `console.error` and continue; the login must not fail. Research D8.
- [X] T010 [US2] In `POST /api/member-card-sync` STEP 1 `updateStmt` (`routes/member_card.js`, around line 410):
  - Add `gender = CASE ? WHEN 'm' THEN 'Herr' WHEN 'f' THEN 'Frau' ELSE gender END,` after `title = ?,`.
  - Pass `r.gender` in the matching position of `updateStmt.run(...)`, i.e. after `r.title`.
  - Keep the parameter order consistent with the SQL. Research D8.

### Verify

- [X] T011 [US2] Verify against `app.db`:
  - The export has 23 headers, and the logical record count equals `SELECT COUNT(*) FROM member_card` (parse it with json2csv/`csv-parse` or a quick Node parser; do not count physical lines).
  - The 69 rows with `serial_number` have both pass links.
  - The 3 multi-line `remarks` rows parse into exactly 23 fields.
  - A table with zero rows (run the helper with `[]` and the fields) returns the header only.
  - Quickstart scenarios 3–7 and 11.
- [X] T012 [US2] Manually verify the write paths: Quickstart scenario 8 (portal login → Last Login filled) and scenario 9 (sync update with gender `f` → `Frau`, and an unknown gender keeps the existing value).

**Checkpoint**: Every reported missing field appears in the export and fills going forward.

---

## Phase 5: User Story 3 - Readable column headers and values (Priority: P3)

**Goal**: Coded and date values are human-readable and consistent (FR-010, FR-011).

**Independent Test**: Quickstart scenario 7. Active shows `Yes`/`No`, Type shows the tier name, and all dates use the same format.

- [X] T013 [US3] In `routes/member_card.js`, add these formatters:
  - `toYesNo(v)`: `1`/`true`/`"1"` give `"Yes"`, `0`/`false`/`"0"` give `"No"`, null gives `""`.
  - `typeLabel(v)`: `7` gives `"Corporate (red)"`, `5` gives `"Blue (non-paid)"`, `1` gives `"Blue (paid)"`, null gives `""`, anything else gives `String(v)`.
  - `formatDate(v, withTime = true)`: null/empty gives `""`. Otherwise parse with `new Date(v)`; if the result is invalid, return `v` unchanged. Format as local-agnostic `YYYY-MM-DD HH:mm`, or `YYYY-MM-DD` when `withTime` is false, using UTC getters for SQLite `datetime('now')` and ISO values.
  - Research D4.
- [X] T014 [US3] In `MEMBER_CARD_EXPORT_FIELDS` (`routes/member_card.js`):
  - Use `toYesNo` for Active and Paid, and `typeLabel` for Type.
  - Use `formatDate(…, false)` for Birthday.
  - Use `formatDate` for Card Expiry Date, Last Login, Created At and Modified At.
  - Keep the labels as in data-model.md.
- [X] T015 [US3] Verify: Active and Paid contain only `Yes`/`No`/empty. The mixed-format birthday `Fri Dec 31 1999 19:00:00 GMT-0500 …` becomes `2000-01-01`, matching the UTC instant of `1999-12-31 19:00 -05:00`. Check the Type labels with Quickstart scenario 7.

**Checkpoint**: All three stories are complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T016 Performance check: the full export (~4,700 rows) completes in under 10 s locally (SC-005). Time it with `curl -w "%{time_total}"`.
- [ ] T017 [P] Run every scenario in `specs/015-member-card-csv-export/quickstart.md` end to end, including scenario 12 (Member export regression) and opening the file in Excel on Windows and macOS, Google Sheets and Numbers.
- [X] T018 [P] Update `specs/015-member-card-csv-export/checklists/requirements.md` notes with the verification results, and set the spec **Status** to `Implemented` in `specs/015-member-card-csv-export/spec.md`.

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (T001) → Foundational (T002–T003) → US1 → US2 → US3 → Polish.
- US2 builds on T004 (the BOM option on the same call), and US3 edits the field list created in T007. The stories are therefore implemented in order, but each one is **validated** on its own using its own quickstart scenarios.

### Within Stories

- US2: T006 → T007 → T008. T009 and T010 are independent of T006–T008; they are separate handlers in the same file, so do them sequentially to avoid edit conflicts. T011 depends on T008, and T012 depends on T009–T010.
- US3: T013 → T014 → T015.

### Parallel Opportunities

- T003 (reading `routes/member.js`) can run alongside T004 once T002 is done.
- T017 and T018 touch different files and can run in parallel after T016.
- Edits within `routes/member_card.js` are sequential because they are in one file.

## Parallel Example

```text
After T002:
  Task: "T003 Confirm routes/member.js export unchanged"
  Task: "T004 [US1] BOM + charset in routes/member_card.js"
After T016:
  Task: "T017 Run full quickstart"
  Task: "T018 Update checklist + spec status"
```

## Implementation Strategy

1. **MVP**: T001–T005 (umlauts fixed). This can ship alone as a quick win.
2. **Increment 2**: T006–T012 (complete columns + Apple Pass + Last Login/Gender recording). This resolves the reported missing values.
3. **Increment 3**: T013–T015 (readable values).
4. **Wrap up**: T016–T018.
