# Quickstart: Validate the member card CSV export

## Prerequisites

- The backend is running locally against `app.db`, and you are logged in to the admin dashboard.
- Test records (create them in the Member Card grid or via SQL):
  1. First name `Jürgen`, last name `Weiß`, partner `Café Größe®`, mobile `971549940636`.
  2. A card with a `serial_number` and `google_pass_token` (generate a virtual card through the member portal, or copy the values from an existing row).
  3. Remarks containing a line break, a comma, a `"` and a value that starts with `=1+1`.
  4. An inactive card (`active = 0`).

## Scenarios

| # | Step | Expected |
|---|---|---|
| 1 | Dashboard → Member Card → **Export**, then double-click the file (Excel, Windows and macOS) | `Jürgen Weiß` and `Café Größe®` display correctly; no `Ã` characters anywhere |
| 2 | Open the same file in Google Sheets and Numbers | Same as above; the first header reads `ID` with no stray characters |
| 3 | Check the header row | 23 headers in the order given in [data-model.md](./data-model.md), including Active, Gender, Last Login, Serial Number, Google Pass, Apple Pass |
| 4 | Check record 2 | Serial Number, Google Pass and Apple Pass (`…/apple_pass/corporate-card/<serial>.pkpass`) are filled; the Apple link downloads the pass |
| 5 | Check record 3 | Remarks stay in one cell; the columns after it are aligned; `=1+1` shows as text, not `2` |
| 6 | Check record 1 mobile number | Shows `971549940636`, not `9.71549E+11` |
| 7 | Check record 4 | `Active` = `No` |
| 8 | Log in to the member portal as a test member (OTP), then export again | That member's `Last Login` is filled with the current time |
| 9 | Run a partner sync whose update row has gender `f` | `Gender` = `Frau` for that member after the export |
| 10 | `curl -s -D- -b <cookie> "$SERVER/api/member-card-csv-data?delimiter=semicolon" \| head -c 400 \| xxd \| head` | Header shows `charset=utf-8`; body starts with `efbb bf`; fields are separated by `;` |
| 11 | Point at an empty `member_card` table (test DB) and export | 200, header row only |
| 12 | `GET /api/member-csv-data` (the Member export) | Unchanged output (regression check) |

## Row count check

The number of data rows in the export must equal `SELECT COUNT(*) FROM member_card`. Count logical CSV records, not physical lines, because multi-line remarks span several lines.
