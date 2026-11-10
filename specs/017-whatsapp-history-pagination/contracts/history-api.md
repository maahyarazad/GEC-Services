# Contract: GET /api/whatsapp/history/:phone

Auth: unchanged (same session middleware as today).

## Request
| Param | In | Required | Default | Notes |
|---|---|---|---|---|
| `phone` | path | yes | — | digits, e.g. `971501234567` (WaId) |
| `limit` | query | no | 20 | integer, clamped to 1–50 |
| `cursor` | query | no | — | `nextCursor` from previous response; omit for newest page |

## Responses
**200**
```json
{
  "status": true,
  "result": [ { "id": "r:8801", "type": "r", "body": "Hi", "media_url": null, "media_type": null, "received_at": "2026-11-01 12:15:02" } ],
  "hasMore": true,
  "nextCursor": "eyJyIjp7...}"
}
```
- `result` is oldest→newest within the page; pages go back in time.
- `hasMore=false` ⇒ `nextCursor` is `null`.
- Empty conversation: `result: []`, `hasMore: false`.

**400** `{ "status": false, "message": "Invalid cursor" }` (bad/garbled cursor or non-integer limit)

**500** `{ "status": false, "message": "Failed to fetch WhatsApp history" }` (also fixes the old misleading text "Failed to fetch WhatsApp templates")

## Compatibility
Old callers sending no params now receive 20 messages instead of everything. The only known caller is
`QuickReply.jsx`, updated in this feature. Response gains `hasMore`, `nextCursor`, and per-item `id`.

## Caching (User Story 4)
Transparent to clients: the response shape is unchanged, and repeating a request with the same
`cursor` returns the same body. Pages requested with a cursor may come from the server's memory
cache. The first page is always built fresh. No HTTP cache headers are added, because the app
already sends credentials and the cache lives on the server.

## Server algorithm (summary)
1. Decode cursor → per-source cursor.
2. For each source run its prepared statement with `limit+1` (first-page or after-cursor variant).
3. Merge the two lists by `(ts desc, id desc)`; `hasMore = merged.length > limit`; take `limit`.
4. Fetch Twilio body only for the sent rows in the taken set.
5. Build `nextCursor` from the last taken row of each source (keep previous cursor value for a source
   with no rows taken).
6. Sort page ascending by displayed time; format; return.


---

# Contract additions (User Stories 5–6)

| Endpoint | New query param | Behaviour |
|---|---|---|
| `GET /api/whatsapp/list` | `refresh=1` | bypass and replace the cached template list |
| `GET /api/twilio/approvals` | `refresh=1` | same; uses the template list fetched with `force` |
| `GET /api/whatsapp/insight` | `refresh=1` | recompute this date range and store it again |
| `GET /api/whatsapp/insight-by-type` | `refresh=1` | same |
| `GET /api/whatsapp/attendance-insight-by-type` | `refresh=1` | same |

Insight routes: a missing or invalid `startDate`/`endDate` → **400** `{ status: false, message: "Invalid date range" }`
(today it is an uncaught `RangeError` → 500). Response bodies are otherwise unchanged.
