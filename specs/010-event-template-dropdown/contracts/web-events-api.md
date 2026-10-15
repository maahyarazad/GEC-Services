# API Contract: Web Events Template Source

One new endpoint. Read-only. Admin-guarded via the existing `/api/` chokepoint
(`server.js`: `authorize_admin` + `authorize_admin_full`). Added to
`routes/events.js`.

## GET /api/web-events

Returns every `web_events` row from the external MySQL database, normalised to
the fields the Create/Edit Event modal needs to seed its form.

### Request

- **Method**: `GET`
- **Path**: `/api/web-events`
- **Auth**: admin session cookie (sent with `credentials: "include"`). A
  limited-tier or unauthenticated caller is rejected by the `/api/` gate
  (401/403) before reaching the handler.
- **Query params**: none.
- **Body**: none.

### Success Response — 200

```json
{
  "status": true,
  "data": [
    {
      "id": 42,
      "title": "Summer Gala 2026",
      "description": "Annual summer networking gala.",
      "eventDate": "2026-07-18 19:00:00"
    },
    {
      "id": 41,
      "title": "Spring Meetup",
      "description": "",
      "eventDate": null
    }
  ]
}
```

- `data` is an array (possibly empty).
- `eventDate` is the raw DB datetime string or `null`; the client normalises it
  to the `datetime-local` format (`YYYY-MM-DDTHH:mm`).
- `description` is `""` when the source column is null.

### Empty Result — 200

```json
{ "status": true, "data": [] }
```

The dropdown renders with no options and a "no templates" indication; manual
event entry is unaffected.

### Error Response — 500

```json
{ "status": false, "message": "Server error" }
```

Returned when the MySQL query fails (e.g. database unreachable). The client
treats this as "no templates available" and keeps the modal usable for manual
entry (FR-007). The underlying error is logged server-side with a
`${Date.now()}` prefix, consistent with the other routes.

### Auth Failure — 401 / 403

Handled by the `/api/` middleware chokepoint, not the handler:
- **401** — no/invalid admin session.
- **403** — authenticated but limited-tier (feature 008).

### Behavioural guarantees

- **Read-only**: the handler issues a single `SELECT`; it never writes to
  `web_events`.
- **Column projection**: only `id`, `title`, `description`, and the date column
  are selected (aliased to `eventDate`) — never `SELECT *` to the client.
- **Ordering**: rows are returned most-recent-date first.
- **Shape stability**: the response keys (`id`, `title`, `description`,
  `eventDate`) are fixed; if the physical `web_events` column names differ, only
  the SQL aliases change — the contract above does not.
