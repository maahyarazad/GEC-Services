# Research: Corporate member card CSV export

**Feature**: 015-member-card-csv-export | **Date**: 2026-10-22

## Current state (evidence)

- Route `GET /api/member-card-csv-data` (`routes/member_card.js:608`) runs `dbService.findAll("member_card")`, which is `SELECT *`, and passes the rows to `exportTableAsCSV` (`services/csvParser.js`). That function uses `json2csv@6.0.0-alpha.2` `Parser` with default options.
- Regenerating the export from local `app.db` (4,664 rows) gives all 22 columns. Every column is present, so json2csv infers fields across all rows.
- How often the columns the user named are filled in local data:

  | Column | Rows with a value | Why it is empty |
  |---|---|---|
  | `google_pass_token` | 69 / 4,664 | Written only by `POST /member-pass`, when the member generates a virtual card |
  | `serial_number` | 69 / 4,664 | Same as above |
  | `gender` | 3 / 4,664 | Written only by sync add/insert (`m`/`f` → `Herr`/`Frau`). Sync **update** (STEP 1 `updateStmt`) and `/member-pass` never write it |
  | `last_login` | 0 / 4,664 | **Never written anywhere** in the codebase |
  | `active` | 4,664 / 4,664 (196 = 1) | Present, but shown as `0`/`1`, which reads as missing or meaningless |
  | Apple Pass | n/a | Not a column. The file is `pass_storage/corporate-card/<serial_number>.pkpass`, served at `/apple_pass/corporate-card/<serial_number>.pkpass` (`server.js:123`, `member_card.js:131`) |

- The response has no BOM and its header is `Content-Type: text/csv` with no charset. Excel on Windows/macOS decodes a BOM-less file as ANSI (Windows-1252), so "Müller" becomes "MÃ¼ller".
- 3 rows have multi-line `remarks`. json2csv quotes them correctly, but its default EOL is `\n`.
- Each `google_pass_token` is about 3,785 characters, well under Excel's 32,767-character cell limit.
- `birthday` is stored in mixed formats (ISO and `Date.toString()` output).

## Decisions

### D1 — UTF-8 BOM + charset header
- **Decision**: Use json2csv's `withBOM: true` and set `Content-Type: text/csv; charset=utf-8`. Verified that json2csv v6 emits `﻿` at the start.
- **Rationale**: The BOM is the only signal Excel honours when a file is opened by double-click. Google Sheets and Numbers ignore it.
- **Alternatives**: UTF-16LE TSV (robust in Excel, but awkward elsewhere); a `sep=,` hint line (Excel then **ignores** the BOM, which breaks umlauts). Both rejected.

### D2 — Explicit field list with labels
- **Decision**: Replace the inferred fields with an explicit ordered `MEMBER_CARD_EXPORT_FIELDS` list (label + value getter) in `routes/member_card.js`. The labels match the grid headers. The list includes all 22 table columns plus a derived `Apple Pass` column.
- **Rationale**: Columns, order and labels become deterministic. It gives one place to add derived and formatted values. A column can no longer silently disappear if, for example, it is null in every row of a filtered export.
- **Alternatives**: Keep `SELECT *` inference (no labels, no derived columns). Rejected.

### D3 — Derived Apple Pass link
- **Decision**: `Apple Pass = serial_number ? ${CLIENT_ORIGIN}/apple_pass/corporate-card/${serial_number}.pkpass : ""`. This reuses the `titleToSlug("CORPORATE CARD")` logic already used in `/member-pass` and in the membership email.
- **Rationale**: It is the same link members receive by email, so nothing new needs to be stored.
- **Alternatives**: Check that the file exists on disk for each row (slow and unnecessary); store a new `apple_pass_path` column (duplicates data). Both rejected.

### D4 — Readable values
- **Decision**: `active` and `paid` become `Yes`/`No`. `type` becomes `7 → Corporate (red)`, `5 → Blue (non-paid)`, `1 → Blue (paid)`, and any other value is passed through. Dates (`card_expiry_date`, `last_login`, `birthday`, `metadata_*`) become `YYYY-MM-DD HH:mm` (birthday `YYYY-MM-DD`); unparseable values pass through unchanged. `null`/`undefined` become an empty cell.
- **Rationale**: FR-005, FR-010 and FR-011. A `0` shown under "Active" is part of what the user perceives as missing.

### D5 — Long numbers and CSV injection
- **Decision**:
  - `mobile_number`, `card_number` and `memberId`: when the value is all digits (optionally with a leading `+`) and 10 or more characters long, emit it as `="<value>"`. Excel and Google Sheets both then show it as text, in full.
  - Any other string value that starts with `=`, `+`, `-`, `@`, tab or CR is prefixed with `'` (OWASP CSV-injection guidance).
- **Rationale**: FR-006 and FR-007. The `="…"` wrapper is applied only to values we control and have checked to be numeric, so it is never an injection path.
- **Alternatives**: A leading tab character (invisible, but it pollutes the data); doing nothing (12-digit UAE numbers turn into `9.71E+11`). Both rejected.

### D6 — Delimiter and EOL
- **Decision**: Keep `,` as the default delimiter, with `eol: "\r\n"` (RFC 4180). Accept an optional `?delimiter=semicolon` query parameter for German-locale Excel users. The frontend is unchanged, so the default stays comma.
- **Rationale**: Most users are in the UAE with English Excel. A semicolon default would break them. FR-009 is a SHOULD.

### D7 — Empty export
- **Decision**: Zero rows → return the header row only, with status 200. Today `exportTableAsCSV` rejects and the route returns 500.

### D8 — Start recording the never-written fields (FR-003b)
- **Decision**:
  - `last_login`: in `POST /member-login`, after signing the token, run `UPDATE member_card SET last_login = datetime('now') WHERE id = ? AND email = ?` using the posted member's `id` and `email`. This is the call the member portal makes after OTP verification.
  - `gender`: add `gender = CASE ? WHEN 'm' THEN 'Herr' WHEN 'f' THEN 'Frau' ELSE gender END` to the sync STEP 1 `updateStmt`. Using `ELSE gender` means an existing value is never wiped.
- **Rationale**: Without these, the Last Login and Gender columns stay empty forever, whatever the export does.
- **Known limitation**: `/member-login` trusts the posted body (an existing issue, out of scope). Matching on both `id` and `email` limits a forged call to stamping a timestamp on a record the caller already knows.
- **Not recoverable**: Last logins from before this change cannot be reconstructed.

### D9 — Keep the generic helper backward compatible
- **Decision**: `exportTableAsCSV(rows, options = {})` passes `options` (fields, withBOM, delimiter, eol) through to json2csv. The existing caller `routes/member.js` passes nothing and behaves exactly as before.
