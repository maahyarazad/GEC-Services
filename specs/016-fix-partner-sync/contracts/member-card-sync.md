# Contract: `POST /api/member-card-sync` and pending-count endpoints

**Auth**: admin (global `/api/` gate in `server.js`). **Content-Type**: `application/json`

## `POST /api/member-card-sync`

### Request

```json
{ "partner": "Example GmbH", "language": "en" }
```

| Field | Rule |
|---|---|
| `partner` | Required. Matched after lower-casing, trimming and umlaut folding (unchanged) |
| `language` | Required, `en` or `de`. Corporate Member sends `en`, Delivery Tracking "Sync (DE)" sends `de` |

The sync processes **all** pending rows (`synchronized = 0`) of that partner **and language**,
with no age limit. Rows of the other language are not touched.

### Response `200`

```json
{
  "status": true,
  "inserted": 3,
  "updated": 2,
  "moved": 1,
  "deactivated": 1,
  "superseded": 0,
  "not_found": 1,
  "conflict": 1,
  "already_active": 0,
  "invitations_queued": 3,
  "moves":     [{ "mobile_number": "971500000001", "from_partner": "Partner A" }],
  "conflicts": [{ "mobile_number": "971500000002", "action": "delete", "owner_partner": "Partner C" }]
}
```

- `updated` counts same-partner updates, plus adds that refreshed an existing same-partner card.
  It does not include moves.
- `invitations_queued` = `inserted`. Invitations are sent after the response, in batches of 25
  every 10 s. A failure is logged in `error_log` (`origin_function: "sendBatchEmails"`) and does
  not stop the rest.
- Running the sync again with no new upload returns all counts as 0.

### Errors

| Status | When |
|---|---|
| 400 | `partner` missing; `language` not `en`/`de` |
| 500 | Database error. Nothing is changed (single transaction) |

## `GET /api/member-card-partner-stats` (changed fields)

Each row adds `pending_en`, `pending_de` and `oldest_pending` (ISO-like text or `null`).
`available_update` = `pending_en + pending_de` and no longer has a 1-month window.

## `GET /api/partner-onboarding-pending-counts` (changed fields)

```json
{ "status": true, "data": [
  { "partner": "Example GmbH", "pending_count": 5, "pending_en": 3, "pending_de": 2,
    "oldest_pending": "2026-09-14 08:12:00" }
] }
```

There is no 1-month window. `pending_count` keeps its meaning (total pending).

## UI contract

| Screen | Behaviour |
|---|---|
| Corporate Member, left table | Available Update shows `EN n · DE m`. A "> 30 days" warning chip appears when `oldest_pending` is more than 30 days old (tooltip: the date). The Sync button shows only when `pending_en > 0` |
| Corporate Member, right table | The Sync button sends `en` (unchanged) |
| Delivery Tracking | "Sync (DE)" is disabled when the selected partner's `pending_de = 0` |
| Both | Success snackbar: `inserted / updated / moved / deactivated` plus `not found / conflict / already active` when non-zero. Moves and conflicts are listed on a dialog or snackbar action |
