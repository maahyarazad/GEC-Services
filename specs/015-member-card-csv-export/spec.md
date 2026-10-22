# Feature Specification: Corporate member card CSV export — UTF-8 umlauts and complete column values

**Feature Branch**: `015-member-card-csv-export`

**Created**: 2026-10-22

**Status**: Implemented (pending manual app checks)

**Input**: User description: "in the corporate member card csv export - in the back end make sure the UTF 8 is there to it can get the umla letters and also it should fetch the entire columns values some are missing from the export csv"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Umlauts and special characters display correctly (Priority: P1)

An admin opens the Member Card grid in the dashboard and clicks **Export**. They open the
downloaded CSV in Excel. Names such as "Müller", "Jürgen Weiß" and "Ørsted", and partner names
such as "Marriott® Resort Palm Jumeirah", look exactly as they do in the dashboard. Today Excel
shows them garbled, for example "MÃ¼ller" and "MarriottÂ®".

**Why this priority**: The export is shared with partners and used for mail merges and card
printing. A garbled name on a member card or in an email is visible to the member and looks
unprofessional. About 6% of current member card records (264 of 4,664) contain at least one
non-ASCII character.

**Independent Test**: Create a member card whose first name is "Jürgen" and partner is
"Café Größe®". Export, open the file in Excel by double-clicking it (no import wizard), and
check that both values display correctly.

**Acceptance Scenarios**:

1. **Given** member cards containing German umlauts (ä, ö, ü, Ä, Ö, Ü, ß), **When** the admin exports and double-clicks the file to open it in Excel (Windows or macOS), **Then** every character displays exactly as stored.
2. **Given** member cards containing other non-ASCII characters (®, é, ø, Arabic script, emoji), **When** exported and opened, **Then** those characters also display correctly.
3. **Given** the same export file, **When** it is opened in Google Sheets, Numbers, or a text editor, **Then** the characters display correctly there too, and the header row has no stray characters.

---

### User Story 2 - Every column and value is present in the export (Priority: P1)

An admin exports member cards. Each row in the CSV has every column the admin expects, filled
with the value stored for that member. No cell is blank when the record actually has a value, and
no row is split or shifted so that values end up under the wrong header.

**Why this priority**: The user reports values missing from the export. An incomplete export
cannot be used for reconciliation with partners or for re-import, and admins then have to copy
data out of the grid by hand.

**Independent Test**: Pick 10 member cards, including ones with remarks that contain line
breaks, commas or quotes. Export, open the file in Excel, and compare every column of those rows
with the record in the dashboard edit form.

**Acceptance Scenarios**:

1. **Given** any member card record, **When** it is exported, **Then** the CSV row has a value for every field that holds data for that record, under the correct header.
2. **Given** a value that contains a line break, comma, semicolon or double quote (e.g. multi-line remarks), **When** the file is opened in Excel, **Then** the value stays inside one cell and the following columns of that row stay aligned.
3. **Given** a member card with a virtual pass, **When** exported, **Then** the row includes the Google Pass link, the Serial Number, the Apple Pass link (derived from the serial number), Active, Gender and Last Login. These are the values reported missing (clarified 2026-10-22). A cell is empty only when the record has no data for that field.
4. **Given** long numeric values such as mobile numbers (e.g. 971549940636) and card numbers, **When** the file is opened in Excel, **Then** they show in full, not in scientific notation (9.71E+11), and keep any leading zeros or "+".

---

### User Story 3 - Readable column headers and values (Priority: P3)

The admin sees clear column headers (e.g. "First Name", "Card Expiry Date") that match the
dashboard grid. Coded values are written out in plain words, for example Type "Corporate" and
Active "Yes" or "No".

**Why this priority**: This is a usability improvement. Exporting the data completely and
correctly (P1) comes first.

**Independent Test**: Export, then check that the headers match the grid column titles and that
coded values are written in plain words.

**Acceptance Scenarios**:

1. **Given** an export, **When** it is opened, **Then** the header row uses the same labels as the dashboard grid, and columns that have no grid equivalent still have readable headers.
2. **Given** dates stored in mixed formats (e.g. "2027-06-04 12:22:22" and "Fri Dec 31 1999 19:00:00 GMT-0500"), **When** exported, **Then** all date columns use one consistent, readable format.

---

### Edge Cases

- No member card records exist: the export downloads a file that contains only the header row, instead of failing.
- A field is genuinely empty in the record: the cell is left blank. It must not contain "null" or "undefined".
- A value starts with `=`, `+`, `-` or `@`: it must not be run as a spreadsheet formula when the file is opened (CSV injection). It still displays as the original text, and phone numbers starting with "+" stay readable.
- The export is very large (more than 10,000 records): the download completes and no rows are cut off.
- Some records include fields that other records do not have, for example a column added later: the column still appears in the header, and rows without that value have a blank cell.
- The download is opened by Excel with a German or European regional setting, where the list separator is ";": columns are still split correctly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The member card export MUST be encoded as UTF-8 and MUST tell spreadsheet applications that it is UTF-8 (including Excel when the file is opened by double-click), so that all non-ASCII characters display correctly.
- **FR-002**: The download response MUST declare the UTF-8 character set.
- **FR-003**: The export MUST include every column of the member card record and every value stored for each exported record. This explicitly includes Google Pass (link), Serial Number, Active, Gender and Last Login.
- **FR-003a**: The export MUST include an **Apple Pass** column. It holds the public download link of the member's Apple Wallet pass when the card has a serial number, and is empty otherwise.
- **FR-003b**: Fields that are never recorded today, or only sometimes (Last Login, and Gender on synchronized updates), MUST start being recorded, so the export columns fill over time.
- **FR-004**: Values that contain line breaks, commas, semicolons or double quotes MUST be escaped, so each value stays in one cell and each record stays on one logical row.
- **FR-005**: Empty values MUST be exported as empty cells, never as the literal text "null" or "undefined".
- **FR-006**: Long numeric identifiers (mobile number, card number, member ID) MUST be exported so that spreadsheet applications show them in full and do not drop leading zeros or a leading "+".
- **FR-007**: Values that spreadsheet applications could run as formulas MUST be neutralised (protection against CSV injection).
- **FR-008**: The export MUST succeed when there are zero records and return a file with only the header row.
- **FR-009**: The export SHOULD open with columns split correctly in Excel on both comma-separator and semicolon-separator (German/European) regional settings.
- **FR-010**: Column headers SHOULD use the human-readable labels from the dashboard grid, and coded values (type, active, paid) SHOULD be written as readable text.
- **FR-011**: Date columns SHOULD use one consistent format across all rows.
- **FR-012**: Whoever can export today MUST still be able to export, and nobody else. Access does not change.

### Key Entities

- **Member card**: A corporate or individual membership card. Its fields are the card number, the member's name, title and gender, mobile number, email, card expiry date, type (e.g. corporate), partner (the company), active and paid status, birthday, remarks, virtual-pass serial number, last login, and created/modified timestamps.
- **Partner**: The corporate company a member card belongs to. It is stored as the partner name on the card.
- **Export file**: A CSV file with one row per member card and one header row.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of records with umlauts or other non-ASCII characters display correctly when the export is opened in Excel by double-click (Windows and macOS), Google Sheets and Numbers.
- **SC-002**: For a spot check of at least 20 records, including all records with multi-line or special-character values, every field matches the dashboard exactly, with 0 blank-but-should-have-value cells and 0 shifted columns.
- **SC-003**: The number of data rows in the export equals the number of member card records included in the export (no rows lost or split).
- **SC-004**: Admins no longer need to correct exported names or copy missing values by hand. The reported issue is closed, with no repeat reports.
- **SC-005**: An export of the full member card list (currently about 4,700 records) downloads in under 10 seconds.

## Assumptions

- "Corporate member card CSV export" means the **Export** action on the Member Card grid in the dashboard. It currently exports every member card record, active and inactive, in a single file.
- The export keeps covering all member card records (active and inactive), as it does today. Applying the grid's current filters to the export is out of scope.
- The main consumer is Microsoft Excel used by the GEC team in the UAE and Germany. Google Sheets and Numbers must also work.
- This change is backend only. The dashboard's Export button and how it downloads the file stay the same.
- The column set is the full set of member card fields stored today, plus the derived Apple Pass link. The Google Pass token is exported because stakeholders asked for it; it is the member's "save to Google Wallet" link.
- Values that were never recorded in the past (e.g. Last Login before this change) cannot be recovered. Those cells stay empty for older records.
