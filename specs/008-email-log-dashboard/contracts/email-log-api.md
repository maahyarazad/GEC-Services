# Contract: Email Log Admin API

Router: `routes/email_log.js`, root-mounted in `routes.js` (like its peers). Both endpoints are
guarded by `middleware/auth.authorize_admin` (cookie `a-usr` JWT, `role === 'admin'`), the same
guard every admin section uses. The client calls them with
`fetch(..., { credentials: 'include' })`.

Unauthenticated/forbidden requests return the middleware's standard shape:
`401 { authenticated: false, message: "Unauthorized" }` (or `403 … "Forbidden"`). (FR-010)

Responses follow the project convention of a `status: true|false` envelope (as in
`routes/server_logs.js`).

---

## GET `/api/email-log/categories`

Returns the category summary for the top-level list (US1).

**Auth**: admin required.

**Query params**: none.

**200 response**:

```json
{
  "status": true,
  "categories": [
    { "key": "otp", "label": "OTP / Login Code", "count": 1284, "lastSent": 1760356320000 },
    { "key": "event-registration", "label": "Event Registration Confirmation", "count": 342, "lastSent": 1760351000000 },
    { "key": "uncategorised", "label": "Other / Uncategorised", "count": 3, "lastSent": 1760000000000 }
  ],
  "total": 1629
}
```

- `categories`: one object per category that has at least one entry, each with the stable `key`, the
  human-readable `label` (from the key→label map), the `count`, and `lastSent` (epoch ms of the most
  recent entry). Order: `count` descending (most active first).
- `total`: sum of all counts.
- A category with zero entries is omitted (FR-005 / edge case). An empty log returns
  `{ "status": true, "categories": [], "total": 0 }`.

---

## GET `/api/email-log/entries`

Returns a page of individual log entries for the drill-down (US2) and search (US3).

**Auth**: admin required.

**Query params**:

| param | type | default | notes |
|-------|------|---------|-------|
| `category` | string (category key) | — (all) | filter to one category; omitted/empty = all categories |
| `search` | string | — | case-insensitive substring match on `recipient` (min length enforced server-side, e.g. ≥1 char; blank = no filter) |
| `page` | integer ≥ 1 | 1 | 1-based page index |
| `pageSize` | integer | 50 | clamped server-side to `[10, 200]` |

Unknown `category` values yield an empty page (not an error). `category` and `search` compose with
AND.

**200 response**:

```json
{
  "status": true,
  "entries": [
    {
      "id": 90231,
      "category": "otp",
      "label": "OTP / Login Code",
      "recipient": "jane@example.com",
      "subject": "Your login code",
      "status": "sent",
      "error": null,
      "createdAt": 1760356320000
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 1284,
  "hasMore": true
}
```

- `entries`: newest-first (`ORDER BY created_at DESC`). `label` is the resolved category label for
  convenience. `createdAt` is epoch ms; the client renders it in the admin's locale.
- `total`: total matching rows for the current `category`+`search` filter (for page-count display).
- `hasMore`: `page * pageSize < total`.
- Empty result: `{ "status": true, "entries": [], "page": 1, "pageSize": 50, "total": 0,
  "hasMore": false }` — the client shows the "no matching emails" empty state (FR-009).

**Error**: `500 { "status": false, "message": "<reason>" }` on an unexpected server/DB error.

---

## Security & privacy notes

- These endpoints are **read-only**. There is no endpoint to create/edit/delete log entries over
  HTTP — entries are written only by the server-side `emailLogService.logEmailSend()` call inside the
  email transport.
- `category` and `search` are bound as SQL parameters (never string-concatenated) to avoid
  injection.
- No email body or attachment content is ever returned (FR-012); `subject` is the only free-text
  content and is optional.
