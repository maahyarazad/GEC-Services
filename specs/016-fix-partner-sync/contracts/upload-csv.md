# Contract: `POST /upload-csv` (partner wizard submission)

**Auth**: `authorize_partner` (`partner-usr` cookie). **Content-Type**: `multipart/form-data`

## Request

| Field | Required | Notes |
|---|---|---|
| `file` | yes | CSV produced by `validateAndConvertXlsx`, ≤ 5 MB |
| `partner` | no (**ignored**) | Kept for wizard compatibility. The partner is read from the JWT `partner.title` |
| `delivery_address`, `contact_person`, `phone_number` | yes (wizard-enforced) | Upserted into `partner_delivery_info` |

### CSV columns read by the server (header match is case-insensitive)

| Column | Stored as |
|---|---|
| `Normalized 🔒` (fallback `Mobile Number`) | `normalizePhone()` → `mobile_number`. If empty, the row is rejected and counted in `invalid` |
| `Date of Birth` | `parseBirthday()` → `YYYY-MM-DD` or `NULL` |
| `Title`, `Gender`, `Language`, `Add/Update/Delete` | Sanitized to the CHECK values (unchanged rules) |
| `First Name`, `Last Name`, `Company Email` | Trimmed |

## Response `200`

```json
{
  "status": true,
  "message": "CSV imported successfully",
  "total": 12,
  "inserted": 2,
  "replaced": 1,
  "unchanged": 9,
  "skipped": 9,
  "invalid": 0
}
```

`inserted + replaced + unchanged + invalid = total`. `skipped` is an alias of `unchanged`, kept
for older clients.

## Errors

| Status | When |
|---|---|
| 400 | No file; empty CSV; not a CSV |
| 401 | Missing or invalid partner token, or token without `partner.title` |
| 500 | Database error. The whole upload rolls back, including the delivery info |

## Client-side additions (`validateAndConvertXlsx`)

- `Date` cells and formula results become `YYYY-MM-DD` (UTC parts).
- The result gains `warnings: { rowNumber, reasons[] }[]` for rows kept with an unreadable
  birthday. The Review step lists them.
