# Implementation Plan: Corporate member card CSV export — UTF-8 umlauts and complete column values

**Branch**: `015-member-card-csv-export` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-member-card-csv-export/spec.md`

## Summary

Fix the dashboard's Member Card CSV export so that umlauts and other non-ASCII characters open correctly in Excel, and so that every field is present and readable. The export includes all fields the user reported missing: Google Pass, Serial Number, Active, Gender, Last Login, and a new derived Apple Pass link.

The changes are in the backend only:

- Write a UTF-8 BOM and send the `charset=utf-8` header.
- Use an explicit, labelled field list that includes the derived Apple Pass link.
- Make values readable (Yes/No, type names, consistent dates).
- Keep long numbers from turning into scientific notation in Excel, and protect against CSV injection.
- Return a header-only file when there are no records.
- Start recording `last_login` (on member login) and `gender` (on the sync update step). Today `last_login` is never written, and `gender` is only written on insert.

## Technical Context

**Language/Version**: Node.js (CommonJS), Express

**Primary Dependencies**: `json2csv@6.0.0-alpha.2` (already installed; supports `fields`, `withBOM`, `delimiter`, `eol`), `better-sqlite3`

**Storage**: SQLite `app.db`, table `member_card`. No schema change.

**Testing**: No automated test runner in the repo (`npm test` is a stub). Validation is manual, via [quickstart.md](./quickstart.md), plus a `node -e` check of the generated CSV.

**Target Platform**: Linux server (production), macOS (development)

**Project Type**: Web application (Express backend + React/Vite frontend in `public/`)

**Performance Goals**: The full export (~4,700 rows, ~3.8 KB Google token per pass row) finishes in under 10 s (SC-005). It is in-memory today and stays well under that.

**Constraints**: The frontend is unchanged. The other caller of `exportTableAsCSV` (`routes/member.js`) must behave exactly as before.

**Scale/Scope**: 1 endpoint, 1 shared helper, 2 small write-path changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template, so no project principles are ratified and there are no gates to evaluate. **PASS (N/A)**. Re-checked after Phase 1 design: still N/A, and there are no violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/015-member-card-csv-export/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0: evidence + decisions D1–D9
├── data-model.md        # Phase 1: export columns + changed write paths
├── quickstart.md        # Phase 1: validation scenarios
├── contracts/
│   └── member-card-csv-endpoint.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
services/
└── csvParser.js         # exportTableAsCSV(rows, options): pass-through json2csv options; empty rows → header only when fields given

routes/
├── member_card.js       # MEMBER_CARD_EXPORT_FIELDS + formatters; /api/member-card-csv-data (BOM, charset, delimiter, ORDER BY id DESC);
│                        # /member-login stamps last_login; /api/member-card-sync STEP 1 writes gender
└── member.js            # unchanged caller (regression check only)
```

**Structure Decision**: This is the existing single Express backend layout (`routes/` + `services/`). The column list and formatters live next to the route in `routes/member_card.js`, because only this export uses them. `services/csvParser.js` only gains a backward-compatible `options` parameter.

## Implementation Outline

1. **`services/csvParser.js`**: `exportTableAsCSV(rows, options = {})` passes `options` to `new Parser(options)`. If `rows` is empty **and** `options.fields` is given, it resolves to the header row only. With no options, it still rejects as before (D7, D9).
2. **`routes/member_card.js`**:
   - Add helpers `toYesNo`, `formatDate(value, withTime)`, `typeLabel`, `textSafeNumber` (D5) and `neutralize` (CSV injection, D5).
   - Add `MEMBER_CARD_EXPORT_FIELDS`, 23 `{ label, value: row => … }` entries in the order of [data-model.md](./data-model.md). Apple Pass uses `CLIENT_ORIGIN` + `titleToSlug("CORPORATE CARD")` (D3).
   - In the export route, query `SELECT * FROM member_card ORDER BY id DESC`. Pass `{ fields, withBOM: true, eol: "\r\n", delimiter }` (D1, D6). Set `Content-Type: text/csv; charset=utf-8`.
   - In `/member-login`, after the cookie is set, run a best-effort `UPDATE member_card SET last_login = datetime('now') WHERE id = ? AND email = ?`. A failure here is logged and does not block the login (D8).
   - In `/api/member-card-sync` STEP 1 `updateStmt`, add the `gender` CASE with `ELSE gender`, and pass `r.gender` (D8).
3. **Validate**: run [quickstart.md](./quickstart.md) scenarios 1–12.

## Risks

- **German-locale Excel** still splits commas incorrectly by default. Mitigation: `?delimiter=semicolon`. A frontend toggle is a possible follow-up, but it is out of scope.
- **The `="…"` wrapper** shows literally in plain-text viewers. This is accepted; it applies only to long numeric IDs.
- **`/member-login` trusts the client body.** This is an existing issue and is not widened beyond a timestamp; see research D8.

## Complexity Tracking

No constitution violations to justify.
