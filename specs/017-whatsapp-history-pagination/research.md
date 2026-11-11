# Research: WhatsApp history pagination

## R1 — Pagination style
**Decision**: Keyset (cursor) pagination, not OFFSET.
**Rationale**: New messages can arrive between page requests; OFFSET would shift rows and duplicate/skip
messages. Keyset on `(timestamp, id)` is stable and uses the existing indexes.
**Alternatives**: OFFSET/LIMIT (unstable, scans skipped rows); client-side slicing of the full
history (keeps the Twilio-call cost, defeats the goal).

## R2 — Two sources, one timeline
History merges `twilio_responses` (received) and `twilio_delivery ⨝ twilio_template_message` (sent).
**Decision**: Per source, `ORDER BY ts DESC, id DESC LIMIT limit+1` with a row-value cursor
`(ts, id) < (?, ?)`; merge the two lists newest-first, take `limit`; `hasMore` = merged length > limit.
The cursor stores the last consumed row of **each** source, so consumption from either source stays exact.
**Rationale**: Any page of the merged timeline needs at most `limit` rows from each source, so the
bound is tight and cheap. A single timestamp cursor would drop rows sharing a second boundary.
**Alternatives**: UNION ALL in one SQL query — impossible because sent timestamps/bodies come from
Twilio after the query; single timestamp cursor — loses ties.

## R3 — Sort key for sent messages
**Decision**: Select/page sent rows by `td.metadata_createdAt` (indexed), then order the final page
by the displayed time (Twilio `dateSent`) as today.
**Rationale**: `dateSent` is only known after the Twilio call, which we want to avoid for off-page rows.
The delivery-callback timestamp differs from `dateSent` by seconds, so a sent message could be out of
order relative to a received message within a few seconds *at a page boundary only*. Accepted;
within a page the order is correct.
**Alternative**: also store `dateSent` locally — larger change, out of scope.

## R4 — Indexes
Existing (from `sql_versions/20261106165300_add_twilio_generated_columns.sql` + `sql_versions/20261106165400_add_twilio_message_history_indexes.sql`): `idx_td_to_status (to_number, msg_status, metadata_createdAt)`,
`idx_ttm_messagesid`, `idx_tr_waid ((payload ->> 'WaId'))`.
**Decision**: Add `idx_tr_waid_received ((payload ->> 'WaId'), received_at, id)` so the received query can
satisfy the filter + `ORDER BY received_at DESC, id DESC LIMIT` without sorting. Sent query
already benefits from `idx_td_to_status` for filter+order (id tiebreak is cheap on ≤ small ties).
**Note**: expression in the query must match the index expression exactly (`payload ->> 'WaId'`), as the
current code already does. The new generated columns `body/media_url/media_type` are VIRTUAL and
used only in SELECT, so no index is needed.

## R5 — Prepared statements
Statements are prepared once at module load (current approach). They stay prepared; only parameters
change (`phone`, `ts`, `id`, `limit`). To make the cursor optional without two statements per source,
use `(? IS NULL OR (ts, id) < (?, ?))`, **or** keep two prepared variants (first page / next page).
**Decision**: two variants per source (4 statements) — keeps the planner on the index; `OR ? IS NULL`
can defeat index use.

## R6 — Frontend scroll loading
**Decision**: `IntersectionObserver` on a sentinel element at the top of `.chat-container`
(root = container), triggering `onLoadMore`. After prepending, restore scroll with
`scrollTop += newScrollHeight - prevScrollHeight` in `useLayoutEffect`.
**Rationale**: no scroll-event throttling needed; works with MUI/React state. Guard with a
`loadingMore` ref to prevent duplicate fetches.
**Alternatives**: onScroll with `scrollTop === 0` check (needs throttling, misfires on bounce).

## R7 — React keys
Current code uses array `index` as key; prepending would remount every bubble (media reload, flicker).
**Decision**: add stable `id` per message (`r:<twilio_responses.id>` / `s:<messageSid>`) and key by it.

## R8 — Page size
**Decision**: 20 first page and 20 per scroll (confirmed with user); server clamps `limit` to 1–50;
single constant `HISTORY_PAGE_SIZE = 20` on server and client.

## R9 — What to cache (added for User Story 4)
The expensive part is the Twilio lookup (`messages(sid).fetch()`), one per sent message. The DB
queries are index range scans of ≤ 51 rows (R4) and cost far less.
**Decision**: two in-process caches in `services/cacheService.js`, both size-bounded LRU (a `Map`
in insertion order, no new dependency):
1. **Twilio message cache**, keyed by `messageSid`, holding `{ body, dateSent }`, about 5,000 entries
   and no TTL. A sent WhatsApp message's body and time never change, so it never goes stale.
   This alone makes a reopen cost 0 Twilio calls for messages already seen.
2. **Older-page cache**, keyed by `` `${phone}|${limit}|${cursor}` ``, holding the full response
   `{ messages, hasMore, nextCursor }`, about 500 entries with a 24 h TTL. Rows are inserted with
   `datetime('now')`, so a new row always sorts above every existing cursor, and a cursor page is
   immutable once R10 is fixed. The TTL only covers the rare manual deletion or cleanup of old rows.
**Not cached**: the first page (no cursor), which changes with every new message. With cache 1 it
costs only two index scans plus Twilio calls for brand-new messages. Failed Twilio lookups are not
cached either, and neither is any page that contains one.
**Alternatives**: page-cache the first page too and invalidate it from the delivery and incoming
webhooks (more moving parts, and easy to miss a write path); Redis (not used anywhere in the repo;
one Node process, see below); `node-cache` or `lru-cache` (a new dependency for about 30 lines).
**Process model**: `server.js` runs one Node process with no cluster, so an in-process cache is
correct. With several processes, each would just have its own warm-up, which is still correct.
**Memory**: about 5,000 × 1 KB plus 500 pages × 20 × 1 KB, roughly 15 MB worst case.

## R10 — Cursor must pin both sources (bug found while designing the cache)
Today, if a page takes no rows from one source (for example 20 received and 0 sent), that source has
no entry in `nextCursor`. The next request then runs the *first-page* query for it, which includes
messages that arrived after page 1. Without new messages the result is still correct. With new
messages, a new sent message would show up inside an older page, and that page would no longer be
cacheable.
**Decision**: when building `nextCursor`, pin every source:
- rows were taken from it → `{ ts, id }` of the last one taken (as today);
- rows were returned but none taken → `{ ts: newest.ts, id: newest.id + 1 }`. Because ids are
  integers, `(ts, id) < (ts, id + 1)` means "at or below the newest row seen" and leaves out
  anything inserted later;
- no rows returned (that source is empty for this contact) → `{ ts: "", id: 0 }`, which matches
  nothing (an exhausted marker).
`decodeCursor` already accepts these values (`ts` is a string, `id` an integer).

## R11 — Template list cache (User Story 5)
**Decision**: in `services/cacheService.js`, `templateListCache = createLruCache({ max: 1, ttlMs: 10 min })` under the key
`"all"`, plus a module-level in-flight promise in `services/whatsAppSender.js`.
`fetchContentTemplates({ force = false } = {})`:
1. If `force`, delete `"all"`.
2. On a hit, return `{ status: true, result: hit }`.
3. If a request is in flight, return its promise; concurrent callers, including the grid's two parallel
   requests on Refresh, share one Twilio call.
4. Otherwise call `contents.list()`, cache the array only on success, and clear the in-flight promise in `finally`.
**Why a TTL**: templates can be added or edited in the Twilio console without going through our routes. Ten
minutes bounds that staleness, and Refresh clears it at once.
**Invalidation**: after a successful `deleteContentTemplate` and after a successful create in
`POST /api/twilio/create-template`, delete `"all"`.
**Callers**: the existing call `fetchContentTemplates(req, res)` in `/api/whatsapp/list` passes the wrong
arguments. Change it to `fetchContentTemplates({ force: req.query.refresh === "1" })`. The other callers
take no argument and keep working. The cached array is shared, so callers must not mutate it. Today none
do; they only `.find`, `.forEach` and `.map`.
**Alternatives**: cache inside each route (duplicated, and the webhook path would miss it); caching
failures (would pin the 401 "low credit" answer).

## R12 — Insight cache (User Story 6)
**Decision**: `insightCache = createLruCache({ max: 200 })`, with a TTL passed per `set` (a small extension
of `createLruCache`: `set(key, value, ttlMs?)` overrides the default). The key is
`` `${route}|${start}|${end}` `` with `start`/`end` normalized as today
(`new Date(x).toISOString().slice(0, 10)`).
- TTL is 24 h if `end < todayUtc`, otherwise 5 min. Rows are inserted with `datetime('now')`, so a range
  entirely in the past only changes through `contact_book.type` edits (the "by type" reports) or manual
  cleanup. Refresh covers those.
- Stored and served as `structuredClone` copies, the same pattern as `historyPageCache`.
- `refresh=1` skips the lookup, recomputes and stores again. Other ranges are untouched.
**Why not reset all insight entries on Refresh**: the user is looking at one range. Other ranges either
expire on their own (5 min) or are past ranges that stay valid.
**Alternatives**: precomputing materialized daily aggregates (a bigger change); caching in the browser only
(every admin would still hit SQL).
