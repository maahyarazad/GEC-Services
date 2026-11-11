# Tasks: WhatsApp chat history — lazy loading on scroll-up

**Input**: Design documents from `/specs/017-whatsapp-history-pagination/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/history-api.md, quickstart.md
**Branch**: `017-whatsapp-history-pagination`
**Tests**: Not requested in the spec. Validation is manual via `quickstart.md`; the cursor/merge helpers are kept pure so tests can be added later.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1 = latest 20 on open, US2 = scroll-up loads 20 more, US3 = short conversation

## Phase 1: Setup

- [X] T001 Add `CREATE INDEX IF NOT EXISTS idx_tr_waid_received ON twilio_responses ((payload ->> 'WaId'), received_at, id);` to `sql_files/changes.sql` and apply it to the local database
- [X] T002 [P] Confirm the generated columns from `sql_files/changes.sql` (`twilio_responses.body/media_url/media_type`, `twilio_delivery.to_number/msg_status/msg_sid`) exist in the local DB, since `services/whatsAppSender.js` prepares statements at module load

---

## Phase 2: Foundational (blocks all user stories)

**Purpose**: server-side paging core used by every story

- [X] T003 Add `HISTORY_PAGE_SIZE = 20` and `HISTORY_MAX_PAGE_SIZE = 50` constants in `services/whatsAppSender.js`
- [X] T004 In `services/whatsAppSender.js`, add pure helpers `encodeCursor(obj)` / `decodeCursor(str)` (base64url JSON `{r:{ts,id}, s:{ts,id}}`; throw a typed `InvalidCursorError` on bad base64/JSON/shape: keys only `r`/`s`, `ts` string, `id` integer) and export them
- [X] T005 In `services/whatsAppSender.js`, replace `sentStmt`/`receivedStmt` with four module-load prepared statements per research R5:
  - sent first-page and sent after-cursor: select `td.id AS rowid, ttm.messageSid, td.metadata_createdAt AS ts`, filter `td.to_number=? AND td.msg_status='delivered' AND ttm.contentSid IS NOT NULL`, after-cursor adds `AND (td.metadata_createdAt, td.id) < (?, ?)`, `ORDER BY td.metadata_createdAt DESC, td.id DESC LIMIT ?`
  - received first-page and received after-cursor: select `id, body, media_url, media_type, received_at AS ts, 'r' AS type`, filter `payload ->> 'WaId' = ?` (exact index expression), after-cursor adds `AND (received_at, id) < (?, ?)`, `ORDER BY received_at DESC, id DESC LIMIT ?`
- [X] T006 In `services/whatsAppSender.js`, add pure helper `mergePage(sentRows, receivedRows, limit)` that merges both lists by `(ts desc, id desc)`, returns `{ taken, hasMore }` where `hasMore = merged.length > limit` and `taken` is the first `limit`, and records the last consumed row per source for the next cursor; export it

**Checkpoint**: helpers and statements ready; no behaviour changed yet.

---

## Phase 3: User Story 1 — Open modal, see latest 20 fast (P1) 🎯 MVP

**Goal**: endpoint returns the newest 20 messages; Quick Reply shows them scrolled to the bottom.
**Independent test**: quickstart steps 1 and 4 and UI step 1.

- [X] T007 [US1] Rewrite `fetchHistory(phone, { limit = HISTORY_PAGE_SIZE, cursor } = {})` in `services/whatsAppSender.js`: coerce `String(phone)`, query both sources with `limit + 1` (choose first-page vs after-cursor statement per source from the decoded cursor), call `mergePage`, call `fetchTwilioMessagesDetails` only for the taken sent rows (failed fetches are dropped but still count as consumed), build `nextCursor` (`null` when `!hasMore`; keep a source's previous cursor value when no row of it was taken), sort the page ascending by displayed time, format `received_at` as `YYYY-MM-DD HH:mm:ss`, and return `{ messages, hasMore, nextCursor }`
- [X] T008 [US1] In `services/whatsAppSender.js`, add a stable `id` to each returned message (`r:<twilio_responses.id>` or `s:<messageSid>`) and keep `body`, `media_url`, `media_type`, `received_at`, `type` unchanged
- [X] T009 [US1] Update `router.get("/api/whatsapp/history/:phone")` in `routes/whatsapp_sender.js`: parse `limit` (default 20, clamp 1–50, non-integer → 400 `{status:false,message:"Invalid limit"}`) and `cursor` (`InvalidCursorError` → 400 `{status:false,message:"Invalid cursor"}`), respond `{ status:true, result, hasMore, nextCursor }`, and change the 500 message to "Failed to fetch WhatsApp history"
- [X] T010 [US1] Update `public/src/components/Dashboard/WhatsApp/QuickReply/QuickReply.jsx`: request `/api/whatsapp/history/${WaId}?limit=20`, store `history`, `cursor` (`nextCursor`), `hasMore` from the response, keep `loadingHistory` for the initial load
- [X] T011 [P] [US1] In `public/src/components/Dashboard/WhatsApp/ChatView/ChatView.jsx`, change the message key from array `index` to `msg.id` (fallback to `index` if absent) and keep scroll-to-bottom for the initial load
- [ ] T012 [US1] Run quickstart "API — first page", "Twilio call count" and "UI" step 1; confirm ≤ 20 Twilio fetches and 20 bubbles scrolled to bottom
  - API part verified 2026-11-09 against local app.db with Twilio mocked (≤ limit Twilio calls per page). **UI step 1 still to check in a browser.**

**Checkpoint**: MVP — fast first page. Older messages are not reachable yet.

---

## Phase 4: User Story 2 — Scroll up loads 20 more until all loaded (P1)

**Goal**: scrolling to the top fetches the next 20 older messages without a scroll jump, until `hasMore` is false.
**Independent test**: quickstart steps 2, 3 and UI steps 2, 3, 5.

- [X] T013 [US2] In `QuickReply.jsx`, add `loadingMore` state plus a `loadingMoreRef` guard and a `loadMore()` that, when `hasMore` and not already loading, requests `?limit=20&cursor=<cursor>`, prepends results (`[...older, ...history]`), and updates `cursor`/`hasMore`; on error show the snackbar and set `hasMore=false` to prevent retry loops
- [X] T014 [US2] In `ChatView.jsx`, add props `hasMore`, `loadingMore`, `onLoadMore`; render a top sentinel `<div>` observed by an `IntersectionObserver` (root = `containerRef`) that calls `onLoadMore` when visible and `hasMore && !loadingMore`; disconnect on unmount
- [X] T015 [US2] In `ChatView.jsx`, preserve the reading position on prepend: record `scrollHeight` before the older page is applied and in a `useLayoutEffect` set `scrollTop += newScrollHeight - prevScrollHeight`; only scroll to the bottom for the first load (track with a ref), never after a prepend
- [X] T016 [US2] In `ChatView.jsx`, show a small `CircularProgress` (size ~20) above the first message while `loadingMore`, and nothing when `hasMore` is false; pass `hasMore`, `loadingMore`, `onLoadMore={loadMore}` from `QuickReply.jsx`
- [ ] T017 [US2] Run quickstart "API — walk all pages" (unique ids, total count equals received + delivered template-sent, equals the old full response) and "API — edge cases" (`limit=2`, `limit=500`, `limit=abc`, `cursor=garbage`), then UI steps 2, 3 and 5
  - API part verified 2026-11-09: 7 conversations (up to 209 msgs) walked at limit 1/2/20/50 — no duplicates, no gaps, counts equal an independent full query; edge cases return 200/400 as specified. **UI steps 2, 3, 5 still to check in a browser.**

**Checkpoint**: full lazy loading working end to end.

---

## Phase 5: User Story 3 — Short conversation (P2)

**Goal**: conversations of ≤ 20 messages show everything and never issue a load-more request.
**Independent test**: quickstart edge cases and UI step 4.

- [X] T018 [US3] Verify in `services/whatsAppSender.js` that a conversation with ≤ 20 messages returns `hasMore:false`, `nextCursor:null`, and an unknown phone returns `result: []` (adjust `mergePage`/cursor building if the `limit + 1` probe misreports)
- [X] T019 [US3] In `ChatView.jsx`, make sure the sentinel does not trigger `onLoadMore` when `hasMore` is false or while `loadingHistory` is true; run UI step 4 with a short conversation and confirm no extra request in the network tab

---

## Phase 6: Polish & cross-cutting

- [X] T020 [P] Remove the unused old per-call query code and stale comments in `services/whatsAppSender.js`; keep the "must match idx_tr_waid" note next to the received statements
- [X] T021 [P] Add a deploy note to `specs/017-whatsapp-history-pagination/quickstart.md`: apply `sql_files/changes.sql` (generated columns + indexes) on every environment before deploying, otherwise module-load `db.prepare` fails and the server will not start
- [ ] T022 Run the full `quickstart.md` once more from a clean server start and check the server log for errors; commit on branch `017-whatsapp-history-pagination`

---

## Phase 7: Foundational for caching (blocks US4)

**Purpose**: make every cursor page immutable (research R10). A cache would freeze any page that
can still change, so this comes first.

- [X] T023 In `fetchHistory` in `services/whatsAppSender.js`, build `nextCursor` so it **always** has both `r` and `s`. Per source: if rows of that source were taken, use `{ts, id}` of the last taken row (as now). If rows were returned (`sentRows` / `receivedRows`) but none taken, use `{ ts: newest.ts, id: newest.id + 1 }`, where `newest` is the first row of that source's list. If none were returned and `after[source]` exists, keep `after[source]`. Otherwise use `{ ts: "", id: 0 }`. Explain the `id + 1` trick in a comment (`(ts,id) < (ts,id+1)` means "at or below the newest row seen").
- [X] T024 Re-run `/private/tmp/claude-501/-Users-germanworldclub-Downloads-registration-app20250717-update/6eeb16b9-d28a-42cd-82ab-147596438cf3/scratchpad/test_history.js` (run: `ENVIRONMENT=PRODUCTION node <that path> <repo root>`) (the walk test from `/speckit-implement`), then add a check: build page 1 for a contact, insert one new `twilio_responses` row and one new delivered `twilio_delivery` + `twilio_template_message` pair for that contact **inside a transaction that is rolled back**, request page 2 with page 1's `nextCursor`, and assert that no new row appears. Run against `app.db` with Twilio mocked, as before.

**Checkpoint**: older pages no longer change when new messages arrive.

---

## Phase 8: User Story 4 — Reopen and scroll-back served from the server cache (P2)

**Goal**: no repeat Twilio calls for messages already fetched, and older pages served from memory.
**Independent test**: walk a 200-message conversation twice; the second walk makes 0 Twilio calls and returns identical responses (spec SC-004, SC-005).

- [X] T025 [US4] In `services/cacheService.js`, add `createLruCache({ max, ttlMs = 0 })`. It returns `{ get, set, has, delete, clear, size }` over a `Map`: `get` moves a hit to the newest position, and returns `undefined` and deletes the entry if `ttlMs > 0` and it has expired; `set` evicts the oldest entries while `size > max`. Export it, and export two instances, `twilioMessageCache = createLruCache({ max: 5000 })` and `historyPageCache = createLruCache({ max: 500, ttlMs: 24 * 60 * 60 * 1000 })`, leaving the existing `countCache` exports unchanged.
- [X] T026 [US4] In `fetchTwilioMessagesDetails` in `services/whatsAppSender.js`: for each `msg.messageSid`, use `twilioMessageCache.get(sid)` on a hit, and call `twilioClient.messages(sid).fetch()` only on a miss. On success, store `{ body: twilioMessage.body, dateSent: twilioMessage.dateSent }` and return that same object as `twilioMessage`. Never store failures. Keep the return shape `{ localRecord, twilioMessage, error? }` so `fetchHistory` does not change.
- [X] T027 [US4] In `fetchHistory` in `services/whatsAppSender.js`: when `cursor` is a non-empty string, build `key = \`${phoneStr}|${pageSize}|${cursor}\``. On a `historyPageCache` hit, return `structuredClone(hit)`. On a miss, build the page as now and `historyPageCache.set(key, structuredClone(result))` **only if** every taken sent row had a Twilio result (track this with a boolean while building the page). Never cache when `cursor` is empty (the first page).
- [X] T028 [US4] In `services/whatsAppSender.js`, add a short comment above `fetchHistory` describing both caches, why the first page is not cached, and that the page cache is only correct because of T023 (link research R9/R10).
- [X] T029 [US4] Extend `/private/tmp/claude-501/-Users-germanworldclub-Downloads-registration-app20250717-update/6eeb16b9-d28a-42cd-82ab-147596438cf3/scratchpad/test_history.js` (run: `ENVIRONMENT=PRODUCTION node <that path> <repo root>`). Clear both caches, walk 3 conversations at limit 20 and count Twilio calls. Walk them again and assert 0 Twilio calls and `assert.deepStrictEqual` responses. Then make one SID fail, clear the caches, walk, and assert that the page containing the failed SID is **not** in `historyPageCache` and that the failed SID is not in `twilioMessageCache`. Finally, mutate a returned page object and assert that the next cached response is unchanged (the clone isolates callers).

**Checkpoint**: caching done; the API contract is unchanged.

---

## Phase 9: Polish for caching

- [X] T030 [P] Update `specs/017-whatsapp-history-pagination/quickstart.md` with a "Cache" section: how to see the effect (Twilio call count on the second open) and that a server restart clears the caches. Also note that rows deleted by hand from `twilio_responses` or `twilio_delivery` can still show for up to 24 h in older pages, until a restart.
- [X] T031 Run `node --check services/whatsAppSender.js services/cacheService.js` and both scratch tests (`test_history.js`, `test_route.js`), then re-check that the T022 commit scope includes `services/cacheService.js`.

---

## Phase 10: Foundational for User Stories 5–6

- [X] T032 In `services/cacheService.js`, extend `createLruCache` so that `set(key, value, ttlMs)` takes an optional per-entry TTL overriding the cache default (`ttlMs ?? defaultTtl`; 0 means no expiry). Then add and export `templateListCache = createLruCache({ max: 1, ttlMs: 10 * 60 * 1000 })` and `insightCache = createLruCache({ max: 200 })`. Existing callers of `set(key, value)` must behave as before.

---

## Phase 11: User Story 5 — Template list cache + Refresh (P2)

**Goal**: one Twilio `contents.list` call serves every caller until Refresh, a create or delete, or 10 min.
**Independent test**: spec User Story 5 test; quickstart "Template cache".

- [X] T033 [US5] In `services/whatsAppSender.js`, change `fetchContentTemplates` to `async ({ force = false } = {})`, following research R11. If `force`, call `templateListCache.delete("all")`. On a hit, return `{ status: true, result: hit }`. If a module-level `templateListInFlight` promise exists, return it. Otherwise set `templateListInFlight` to a promise that calls `twilioClient.content.v1.contents.list()`, calls `templateListCache.set("all", templates)` only on success, returns `{ status: true, result: templates }` or, on error, logs and returns `{ status: false, result: error }` as today, and sets `templateListInFlight = null` in `finally`. Import `templateListCache` from `../services/cacheService`. Add a comment saying the cached array is shared and must not be mutated.
- [X] T034 [US5] In `deleteContentTemplate` in `services/whatsAppSender.js`, call `templateListCache.delete("all")` after `remove()` succeeds (not on failure).
- [X] T035 [US5] In `routes/whatsapp_sender.js`, in `router.post("/api/twilio/create-template")`, find the branch where Twilio confirms creation (before the success response) and clear the template cache there. Either import `templateListCache` from `../services/cacheService` and call `templateListCache.delete("all")`, or export a `resetTemplateListCache()` helper from `services/whatsAppSender.js` and call it. Pick one and use it for T034 too.
- [X] T036 [US5] In `routes/whatsapp_sender.js`, change `router.get("/api/whatsapp/list")` from `fetchContentTemplates(req, res)` to `fetchContentTemplates({ force: req.query.refresh === "1" })`. In `router.get("/api/twilio/approvals")`, likewise pass `{ force: req.query.refresh === "1" }`.
- [X] T037 [P] [US5] In `public/src/components/Dashboard/WhatsApp/WhatsApp.jsx`, make `fetchData` accept an optional `{ refresh }` argument and call `/api/whatsapp/list${refresh ? "?refresh=1" : ""}`. Pass `onRefresh={() => fetchData({ refresh: true })}` to both `<TwilioTemplateDataGrid>` usages (around lines 1581 and 1592). Initial load and other callers stay without refresh.
- [X] T038 [P] [US5] In `public/src/components/Dashboard/WhatsApp/TwilioTemplateDataGrid.tsx`, give `fetchApprovals` an optional `refresh` flag that appends `?refresh=1` to `/api/twilio/approvals`, and call `fetchApprovals(true)` from `handleRefresh` only. Both parallel Refresh requests then share one in-flight Twilio call (T033).
- [X] T039 [US5] Test with a scratch script (pattern of `/private/tmp/claude-501/-Users-germanworldclub-Downloads-registration-app20250717-update/6eeb16b9-d28a-42cd-82ab-147596438cf3/scratchpad/test_route.js`: Twilio mocked by injecting into `require.cache`, real router mounted on a throwaway express app). Count `contents.list` calls and assert: 3 sequential `GET /api/whatsapp/list` → 1 call. Two concurrent requests with `refresh=1` → 1 call total. A failure (mock throws) is not cached: the next call retries. After a mocked `deleteContentTemplate` success, the next list makes 1 new call.

**Checkpoint**: template list cached; Refresh, create and delete keep it current.

---

## Phase 12: User Story 6 — Insight report cache + Refresh button (P3)

**Goal**: each report/range is computed once and Refresh recomputes it.
**Independent test**: spec User Story 6 test; quickstart "Insight cache".

- [X] T040 [US6] In `routes/whatsapp_sender.js`, add near the three insight routes:
  - `parseInsightRange(query)`: returns `{ start, end }` normalized with `new Date(x).toISOString().slice(0, 10)` exactly as the routes do now, or `null` when either date is missing or invalid (`Number.isNaN(new Date(x).getTime())`).
  - `getOrComputeInsight(route, start, end, refresh, compute)`: key `` `${route}|${start}|${end}` ``. When `!refresh` and `insightCache.get(key)` hits, return `structuredClone(hit)`. Otherwise run `const data = await compute()`, then `insightCache.set(key, structuredClone(data), end < new Date().toISOString().slice(0, 10) ? 24 * 60 * 60 * 1000 : 5 * 60 * 1000)`, and return `data`.
  Import `insightCache` from `../services/cacheService`.
- [X] T041 [US6] Refactor `router.get("/api/whatsapp/insight")` in `routes/whatsapp_sender.js`. Call `parseInsightRange` and return 400 `{ status: false, message: "Invalid date range" }` when it gives `null`. Move the body that builds `{ response_result, delivery_result }` (template map, both queries, mapping) unchanged into a `compute` callback for `getOrComputeInsight("insight", start, end, req.query.refresh === "1", compute)`. Respond `{ status: true, data }` exactly as before; keep the 500 path.
- [X] T042 [US6] Same refactor for `router.get("/api/whatsapp/insight-by-type")` (route key `"insight-by-type"`, data `{ delivery_result }`) and `router.get("/api/whatsapp/attendance-insight-by-type")` (route key `"attendance-insight-by-type"`, data `{ attendance_result }`) in `routes/whatsapp_sender.js`. The SQL text stays unchanged.
- [X] T043 [P] [US6] In `public/src/components/Dashboard/Dashboard/WhastAppReport.tsx`, change `fetchReport` to take `refresh = false` and append `&refresh=1` when true. Add a small MUI `Button` (`startIcon={<RefreshIcon />}` from `@mui/icons-material/Refresh`, text "Refresh", `size="small"`) next to the date inputs that calls `fetchReport(true)`, disabled while loading. Show the existing loading state during the refresh without unmounting the date filters.
- [X] T044 [P] [US6] Same as T043 in `public/src/components/Dashboard/Dashboard/WhastAppTypeReport.tsx` (`/api/whatsapp/insight-by-type`).
- [X] T045 [P] [US6] Same as T043 in `public/src/components/Dashboard/Dashboard/WhastAppAttendanceTypeReport.tsx` (`/api/whatsapp/attendance-insight-by-type`).
- [X] T046 [US6] Test with a scratch script against `app.db` (router mounted as in T039). For each of the 3 routes:
  - The first and second requests with the same dates return identical `data`, and the second runs no SQL. Check with a spy on `db.prepare`, or by timing.
  - `refresh=1` recomputes.
  - `startDate=garbage` → 400 and no cache entry.
  - A past range gets a 24 h TTL and a range ending today gets 5 min (check via the `expiresAt` of the stored entry or a fake `Date.now`).
  - Each response equals the original SQL run directly for the same dates.

**Checkpoint**: reports open instantly on repeat; Refresh shows fresh data.

---

## Phase 13: Polish for User Stories 5–6

- [X] T047 [P] Add "Template cache" and "Insight cache" sections to `specs/017-whatsapp-history-pagination/quickstart.md`. Cover what Refresh does in each place, the TTLs (10 min / 24 h past ranges / 5 min others), that a restart clears everything, and the existing end-date-exclusive `BETWEEN` behaviour noted in spec.md (unchanged).
- [X] T048 Run `node --check` on `services/cacheService.js`, `services/whatsAppSender.js`, `routes/whatsapp_sender.js`; `npx esbuild` syntax checks on the 5 changed front-end files (as done for ChatView); eslint on the changed front-end files (only pre-existing rule categories may remain); all scratch tests (`test_history`, `test_cursor_pin`, `test_cache`, `test_route`, plus T039/T046). Add the new files to the T022 commit scope.

---

## Dependencies & order

- Phase 1 → Phase 2 → US1 → US2 → US3 → Polish → Phase 7 (cursor pinning) → US4 (cache) → Phase 9.
- T023 must land before T027: the page cache is only correct once cursors pin both sources.
- Phase 10 (T032) → US5 (T033–T039) and US6 (T040–T046) → Phase 13. US5 and US6 are independent of each other; US6's `/insight` reuses `fetchContentTemplates`, so it benefits from US5 but does not need it.
- Within US5: T033 → T034/T035 → T036; T037 ‖ T038 (frontend) once T036's query param exists. Within US6: T040 → T041 → T042 (same file); T043 ‖ T044 ‖ T045.
- T025 blocks T026 and T027. T026 and T027 both edit `services/whatsAppSender.js`, so do them one after the other.
- US2 depends on US1 (it reuses the endpoint and `QuickReply` state). US3 is verification on top of US2.
- Within US1: T007 → T008 → T009 (same service then route); T010 needs T009; T011 is independent of the server tasks.
- T002 can run alongside T001; T020 and T021 can run in parallel at the end.

## Parallel examples

- Setup: T001 ‖ T002
- US1: T011 (ChatView key change) ‖ T007–T009 (server)
- Polish: T020 ‖ T021
- US5: T037 ‖ T038 (two different front-end files)
- US6: T043 ‖ T044 ‖ T045 (three report components); they can be built while T040–T042 are in progress
- US4: T025 (`cacheService.js`) can be written while T023 (`whatsAppSender.js`) is in progress; T030 ‖ T031 at the end

## Implementation strategy

1. **MVP**: Phases 1–3. It already cuts Twilio calls to ≤ 20 per open and makes the modal fast.
2. Add Phase 4 for scroll-up loading; deploy together with the MVP if possible, because the MVP alone hides older messages.
3. Phase 5–6 are verification and cleanup.
4. **Caching increment** (Phases 7–9): T023 is a small correctness fix that is worth shipping on its own. T026 (Twilio-by-SID cache) brings most of the gain; T027 (older-page cache) is on top of that.
5. **Templates and insights** (Phases 10–13): US5 first. It speeds up every page that lists templates and every incoming WhatsApp reply webhook. US6 (reports) after it.
