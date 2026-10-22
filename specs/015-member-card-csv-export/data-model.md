# Data Model: Member card CSV export

There is no schema change. The `member_card` table (SQLite, `app.db`) stays as it is. Two existing columns start being written: `last_login` and `gender` (see research D8).

## Export row (one per `member_card` record, ordered by `id` DESC)

| # | Header | Source | Format |
|---|---|---|---|
| 1 | ID | `id` | as is |
| 2 | Active | `active` | `Yes` / `No` |
| 3 | Type | `type` | `Corporate (red)` (7), `Blue (non-paid)` (5), `Blue (paid)` (1), other → raw |
| 4 | Card Number | `card_number` | text-safe long number (D5) |
| 5 | Partner | `partner` | as is (UTF-8) |
| 6 | Title | `title` | as is |
| 7 | First Name | `firstname` | as is |
| 8 | Last Name | `lastname` | as is |
| 9 | Gender | `gender` | as is (`Herr` / `Frau` / empty) |
| 10 | Birthday | `birthday` | `YYYY-MM-DD` |
| 11 | Mobile Number | `mobile_number` | text-safe long number (D5) |
| 12 | Email | `email` | as is |
| 13 | Card Expiry Date | `card_expiry_date` | `YYYY-MM-DD HH:mm` |
| 14 | Member ID | `memberId` | text-safe long number (D5) |
| 15 | Username | `username` | as is |
| 16 | Paid | `paid` | `Yes` / `No` / empty |
| 17 | Last Login | `last_login` | `YYYY-MM-DD HH:mm` |
| 18 | Serial Number | `serial_number` | as is |
| 19 | Google Pass | `google_pass_token` | as is (the `https://pay.google.com/gp/v/save/…` link) |
| 20 | Apple Pass | derived | `${CLIENT_ORIGIN}/apple_pass/corporate-card/${serial_number}.pkpass` when `serial_number` is set |
| 21 | Remarks | `remarks` | as is (multi-line kept in one quoted cell) |
| 22 | Created At | `metadata_createdAt` | `YYYY-MM-DD HH:mm` |
| 23 | Modified At | `metadata_modifiedAt` | `YYYY-MM-DD HH:mm` |

## Rules for every cell

- `null` or `undefined` → empty cell.
- A string that starts with `= + - @ \t \r` → prefixed with `'`. This does not apply to the D5 number wrapper.
- Every value is quoted per RFC 4180. Embedded `"` is doubled.

## Write paths changed (FR-003b)

| Field | Where | Rule |
|---|---|---|
| `last_login` | `POST /member-login` | `datetime('now')` for the row that matches the posted `id` + `email` |
| `gender` | `POST /api/member-card-sync`, STEP 1 update | `m` → `Herr`, `f` → `Frau`, otherwise keep the existing value |
