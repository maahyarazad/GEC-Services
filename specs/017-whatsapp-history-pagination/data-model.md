# Data Model: WhatsApp history pagination

No new tables or columns. Existing storage (`sql_versions/20261106165300_add_twilio_generated_columns.sql` + `sql_versions/20261106165400_add_twilio_message_history_indexes.sql`):

| Table | Used columns | Notes |
|---|---|---|
| `twilio_responses` | `id`, `received_at`, generated `body`, `media_url`, `media_type`; `payload ->> 'WaId'` for filter | Received messages. Generated cols are VIRTUAL (no storage). |
| `twilio_delivery` | `id`, `metadata_createdAt`, generated `to_number`, `msg_status`, `msg_sid` | Sent-message delivery callbacks; filter `to_number = 'whatsapp:+<phone>' AND msg_status='delivered'`. |
| `twilio_template_message` | `messageSid`, `contentSid` | Join on `td.msg_sid = ttm.messageSid`, `contentSid IS NOT NULL`. |

**New index** (in `sql_versions/20261106165400_add_twilio_message_history_indexes.sql`):
```sql
CREATE INDEX IF NOT EXISTS idx_tr_waid_received
ON twilio_responses ((payload ->> 'WaId'), received_at, id);
```

## Runtime entities

**HistoryMessage** (response item)
- `id` string — `r:<id>` or `s:<messageSid>` (new; React key)
- `type` `"r"` | `"s"`
- `body` string | null
- `media_url`, `media_type` string | null (received only)
- `received_at` `"YYYY-MM-DD HH:mm:ss"` (UAE time, unchanged)

**Cursor** (opaque to client; base64url JSON)
```json
{ "r": { "ts": "2026-11-01 08:15:02", "id": 8812 },
  "s": { "ts": "2026-11-01 08:14:40", "id": 5521 } }
```
Each key is the last row *consumed* from that source; absent key = source exhausted or not yet started
(first page has no cursor). Validation: must decode, keys limited to `r`/`s`, `ts` string, `id` integer.

**Page state (client)**: `messages[]` (oldest→newest), `cursor`, `hasMore`, `loadingInitial`, `loadingMore`.

## Cursor — pinning both sources (R10)
From User Story 4 on, `nextCursor` always has **both** keys. Besides `{ts, id}` of the last row
taken, a source can hold:
- `{ ts: <newest seen ts>, id: <newest seen id> + 1 }`: nothing taken yet, bounded at what page 1 saw;
- `{ ts: "", id: 0 }`: the source was empty for this contact (matches nothing).

## Server caches (in process, `services/cacheService.js`)
| Cache | Key | Value | Bound | Invalidation |
|---|---|---|---|---|
| `twilioMessageCache` | `messageSid` | `{ body, dateSent }` | 5,000 entries, LRU | none (immutable) |
| `historyPageCache` | `${phone}\|${limit}\|${cursor}` | `{ messages, hasMore, nextCursor }` | 500 entries, LRU, 24 h TTL | TTL only |
Not stored: failed Twilio lookups, pages that contain one, and first pages (no cursor).
