# Workflow: Merge & Normalize Event Guest Lists

## Source
`Gästeliste Events.xlsx`

---

## Step 1 — Select Sheets
Pull data only from sheets whose names **start with** one of:
- `BusinessBreakfast`
- `BB`
- `CT`
- `ClubTime`

Ignore all other sheets.

---

## Step 2 — Determine Event Date
For each selected sheet, resolve the date using this priority order:

1. **Metadata** — extract the date / time / timestamp from the sheet or cell metadata, if available.
2. **Sheet name sequence** — if no metadata, derive the date from the naming / sequence pattern in the sheet name.
3. **Null** — if neither is available, leave the date empty (`null`).

---

## Step 3 — Read & Map Columns

### Columns to ignore
- Skip column **A** entirely.
- Skip column **H and everything to its right** (H onward).
- → Only read columns **B through G** (6 columns).

### Column mapping
Build each output row with these columns (B–G map in order, plus two derived fields):

| Output Column | Source |
|---|---|
| `Event Title` | `normalize(sheet name)` — derived |
| `Name` | sheet column B |
| `ClubMember / Partner` | sheet column C |
| `Remarks` | sheet column D |
| `Mobile` | sheet column E |
| `Invitee` | sheet column F |
| `Note` | sheet column G — header is empty in source, so name it `Note` |
| `Date` | from Step 2 — derived |

> **Note:** The B–G assignment above is the assumed order. Verify against the actual sheet headers before running, as real positions may differ.

---

## Step 4 — Normalize Mobile Numbers
For every value in the `Mobile` column:

- Remove all spaces and illegal / non-numeric characters.
- If the cleaned number has **length 9 and starts with `5`** → treat it as a UAE number and prepend country code `971`.
  - Example: `50 123 4567` → `971501234567`

---

## Step 5 — Output
- Merge all collected rows from all selected sheets into a **single sheet**.
- Save the result as an `.xlsx` file.

---

## Open Items (confirm before running)
1. **`normalize(sheet name)` rule** is undefined. Define the prefix → title mapping, e.g.:
   - `BB` → `Business Breakfast`
   - `CT` → `Club Time`
   - `BusinessBreakfast_03` → `Business Breakfast`
   - Specify whether trailing numbers / dates should be stripped.
2. **Verify B–G header positions** against the actual file before mapping, since the assumed order may not match the source.