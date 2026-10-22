# Contract: `GET /api/member-card-csv-data`

Same authentication as today: an admin dashboard session cookie.

## Request

| Query param | Required | Values | Default |
|---|---|---|---|
| `delimiter` | no | `comma`, `semicolon` | `comma` |

An unknown `delimiter` value falls back to `comma`.

## Response 200

Headers:

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename=membership-data-<epoch-ms>.csv
Access-Control-Expose-Headers: Content-Disposition
```

Body:

- Starts with the UTF-8 BOM (`EF BB BF`).
- Line 1 is the header row, with the 23 headers in the order given in [data-model.md](../data-model.md).
- Then one record per member card (all records, active and inactive), ordered by `id` DESC.
- Lines end with `\r\n`. Every field is double-quoted. Embedded line breaks are allowed inside quoted fields.
- With zero records, the body is the BOM plus the header row only.

## Response 500

```json
{ "status": false, "message": "Server error" }
```

The response is unchanged for unexpected failures. "No data" is no longer an error.

## Compatibility

The frontend (`MemberCardDataGrid.jsx` `handleExport`) needs no change: it reads the filename from `Content-Disposition` and saves the blob as is.
