# Quickstart: validating history pagination

## Prerequisites
- Server running locally with the DB containing `sql_versions/20261106165300_add_twilio_generated_columns.sql` + `sql_versions/20261106165400_add_twilio_message_history_indexes.sql` columns/indexes applied
  (plus `idx_tr_waid_received` from `data-model.md`).
- A WaId with > 45 mixed sent/received messages (find one:
  `SELECT payload->>'WaId' w, COUNT(*) c FROM twilio_responses GROUP BY w ORDER BY c DESC LIMIT 5;`).

## 1. API — first page
`GET /api/whatsapp/history/<WaId>` → 20 items, `hasMore: true`, `nextCursor` set, ascending order.

## 2. API — walk all pages
Follow `nextCursor` until `hasMore:false`. Expect: concatenated ids unique; count = total messages
(received count + delivered template-sent count with `contentSid` not null); no gaps.
Compare with the pre-change full response from git history (`SC-002`).

## 3. API — edge cases
- `limit=2` → 2 items; `limit=500` → clamped to 50; `limit=abc` → 400.
- `cursor=garbage` → 400.
- Phone with 7 messages → 7 items, `hasMore:false`.
- Unknown phone → `result: []`.

## 4. Twilio call count
Log or stub `twilioClient.messages().fetch`; first page makes ≤ 20 calls (only sent messages on page).

## 5. UI
1. Open Quick Reply for the long conversation: 20 bubbles, scrolled to bottom, spinner gone.
2. Scroll to top: spinner at top, 20 older bubbles appear, view stays on the same message.
3. Repeat to the end: no spinner and no more requests (network tab).
4. Short conversation: no extra request on scroll.
5. Throttle network to Slow 3G and flick up repeatedly: exactly one request per page.

## Deploy note
Apply `sql_versions/20261106165300_add_twilio_generated_columns.sql` + `sql_versions/20261106165400_add_twilio_message_history_indexes.sql` (generated columns on `twilio_delivery` / `twilio_responses` and the
indexes `idx_td_to_status`, `idx_ttm_messagesid`, `idx_tr_waid`, `idx_tr_waid_received`) on **every**
environment **before** deploying this code. `services/whatsAppSender.js` prepares the history
statements at module load; if a generated column is missing, `db.prepare` throws and the server
does not start. The `ALTER TABLE … ADD COLUMN` lines are not idempotent — skip the ones that already
exist (`PRAGMA table_xinfo(twilio_responses);` lists them, hidden = 2).

## Cache (User Story 4)
Two in-process caches in `services/cacheService.js` (research R9):
- `twilioMessageCache`: sent-message body and time by `messageSid` (up to 5,000, no expiry).
- `historyPageCache`: whole older pages, i.e. requests with a `cursor` (up to 500 pages, 24 h).

**See it work**: open a long conversation and scroll to the end, counting
`twilioClient.messages(...).fetch` calls (for example with a temporary `console.count` in
`fetchTwilioMessagesDetails`). Close it, reopen it and scroll again: 0 Twilio calls. A brand-new
message still shows on the first page, because the first page is never page-cached.

**Good to know**
- A server restart clears both caches. The first open after a deploy is as slow as before.
- A Twilio error is never cached. The affected bubble is missing for that request only and comes
  back on the next one.
- Rows deleted by hand from `twilio_responses` / `twilio_delivery` can still show in **older**
  pages for up to 24 h, or until a restart. Restart the server after such a cleanup.
- Memory grows with the page size. At the default 20 per page it is about 15 MB worst case;
  `HISTORY_MAX_PAGE_SIZE` bounds how large one cached page can get.

## Template cache (User Story 5)
- `fetchContentTemplates()` serves the Twilio template list from `templateListCache` (10 min). Callers
  that ask at the same moment share one Twilio request. Failures are not cached.
- **Refresh** on the template grid sends `?refresh=1` to `/api/whatsapp/list` and `/api/twilio/approvals`.
  Both share one fresh Twilio call.
- Creating or deleting a template from the admin UI clears the cache, so the next list is current
  without Refresh. Edits made in the Twilio console show up after Refresh or within 10 min.
- Benefits every caller: grid, delivery logs, Delivery Status report, quick reply, approvals, and the
  incoming-reply webhook (`handleAutoResponse`).

## Insight cache (User Story 6)
- The three report modals are cached per report and date range: **24 h** when the range ends before
  today (UTC), **5 min** otherwise.
- Each modal has a **Refresh** button next to the dates. It recomputes that report for those dates and
  stores the result again; other ranges are untouched.
- Invalid or missing dates now return **400** "Invalid date range" (before: a 500 from a RangeError).
- Unchanged existing behaviour: `BETWEEN '<start>' AND '<end>'` compares timestamps with a bare date, so
  rows **on** the end date are not counted. The default view (yesterday → today) therefore shows
  yesterday only. Fixing that is a separate change.
- A server restart (pm2 restart, deploy, `max_memory_restart`) clears all of these caches.
