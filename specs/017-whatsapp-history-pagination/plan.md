# Implementation Plan: WhatsApp chat history — lazy loading on scroll-up

**Branch**: `017-whatsapp-history-pagination` | **Date**: 2026-11-09 | **Spec**: [spec.md](./spec.md)

## Summary

Make `GET /api/whatsapp/history/:phone` return the newest 20 messages and let the Quick Reply chat
load 20 older ones each time the user scrolls to the top, until the whole conversation is loaded.
Technique: keyset (cursor) pagination over the two message sources (received / sent), merged
newest-first; Twilio body fetches only for the sent messages on the current page. Frontend uses an
IntersectionObserver sentinel and restores scroll position after prepending. See [research.md](./research.md).

## Technical Context

**Language/Version**: Node.js (Express, CommonJS/ESM as existing), React + Vite on the front end
**Primary Dependencies**: better-sqlite3 (`db.prepare`), `twilio` client, dayjs (utc/tz), MUI `CircularProgress`
**Storage**: SQLite — `twilio_responses`, `twilio_delivery`, `twilio_template_message`; generated columns `body/media_url/media_type` (responses) and `to_number/msg_status/msg_sid` (delivery) from `sql_versions/20261106165300_add_twilio_generated_columns.sql` + `sql_versions/20261106165400_add_twilio_message_history_indexes.sql`
**Testing**: Manual per [quickstart.md](./quickstart.md); unit tests for the pure merge/cursor helpers if the repo has a runner (none found for this service — NEEDS no clarification, helpers kept pure so they are testable)
**Target Platform**: Linux server + browser admin dashboard
**Project Type**: web application (server + `public/` SPA)
**Performance Goals**: first page ≤ 20 Twilio calls; DB queries index-only ordered scans
**Constraints**: preserve response item shape; stable paging under concurrent inserts
**Scale/Scope**: single endpoint, one service function, two React components, one index

## Constitution Check

`.specify/memory/constitution.md` is still the unfilled template (no ratified principles), so there are
no gates to evaluate. Self-imposed checks: no new tables, no breaking change for other callers
(only `QuickReply.jsx` calls the endpoint), no new dependencies. **PASS** (re-checked after design: unchanged).

## Project Structure

### Documentation
```text
specs/017-whatsapp-history-pagination/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/history-api.md
```

### Source Code (files touched)
```text
services/whatsAppSender.js          # fetchHistory(phone, {limit, cursor}); 4 prepared statements; cursor helpers
routes/whatsapp_sender.js           # parse/validate limit+cursor, return hasMore/nextCursor, fix 500 message
sql_versions/20261106165400_add_twilio_message_history_indexes.sql   # + idx_tr_waid_received
public/src/components/Dashboard/WhatsApp/QuickReply/QuickReply.jsx   # page state, loadMore
public/src/components/Dashboard/WhatsApp/ChatView/ChatView.jsx       # top sentinel, scroll preservation, keys by id
```

**Structure Decision**: keep logic in the existing service/route/components; no new modules except
small pure helpers (`encodeCursor`, `decodeCursor`, `mergePage`) exported from the service file.

## Design

### Backend (`services/whatsAppSender.js`)
- Replace the two statements with four prepared statements (first-page / after-cursor × sent / received):
  - **Sent**: `SELECT td.id AS rowid, ttm.messageSid, td.metadata_createdAt AS ts ... WHERE td.to_number=? AND td.msg_status='delivered' AND ttm.contentSid IS NOT NULL [AND (td.metadata_createdAt, td.id) < (?,?)] ORDER BY td.metadata_createdAt DESC, td.id DESC LIMIT ?`
  - **Received**: `SELECT id, body, media_url, media_type, received_at AS ts, 'r' AS type FROM twilio_responses WHERE payload ->> 'WaId' = ? [AND (received_at, id) < (?,?)] ORDER BY received_at DESC, id DESC LIMIT ?` (keep the `payload ->> 'WaId'` expression identical to the index).
- `fetchHistory(phone, { limit = 20, cursor } = {})`: query both with `limit+1`, merge by `(ts desc, id desc)`, `hasMore = merged.length > limit`, take `limit`, call `fetchTwilioMessagesDetails` only for taken sent rows, build `nextCursor`, sort ascending by displayed time, format. Return `{ messages, hasMore, nextCursor }`.
- Keep `String(phone)` coercion and UAE time conversion as in the optimized version.
- Add stable `id` to each item (`r:<id>`, `s:<messageSid>`).
- Failed Twilio fetch: item omitted (as today); it still counts as consumed so the cursor advances.

### Route (`routes/whatsapp_sender.js`)
- Parse `limit` (default 20, clamp 1–50; non-integer → 400) and `cursor` (decode failure → 400).
- Respond `{ status, result, hasMore, nextCursor }`; fix the 500 message wording; log `${Date.now()}` style as elsewhere.

### Frontend
- `QuickReply.jsx`: state `history, cursor, hasMore, loadingInitial, loadingMore`; `fetchHistory(initial)` builds `?limit=20[&cursor=…]`; prepend results (`[...older, ...history]`); guard with a ref against concurrent loads; on error show snackbar and set `hasMore=false` for that session to avoid retry loops.
- `ChatView.jsx`: new props `hasMore`, `loadingMore`, `onLoadMore`; sentinel `<div ref>` at top observed with IntersectionObserver (root = container); show small spinner when `loadingMore`; `useLayoutEffect` records `scrollHeight` before prepend and applies delta after; scroll-to-bottom only for the first load; React `key={msg.id}`.

### Database
- Add `idx_tr_waid_received` to `sql_versions/20261106165400_add_twilio_message_history_indexes.sql` and apply on the server; no migration code in the app (per the project's earlier removal of IIFE migrations).

### Server caching (User Story 4, research R9/R10)
- `services/cacheService.js`: add a small `createLruCache({ max, ttlMs })` (a `Map` with
  get/set/has/delete/clear/size; refresh on get; evict the oldest; optional per-entry expiry), and
  export two instances: `twilioMessageCache` (max 5,000, no TTL) and `historyPageCache`
  (max 500, TTL 24 h).
- `fetchTwilioMessagesDetails`: serve SIDs from `twilioMessageCache`, call Twilio only for misses,
  and store only successful results as `{ body, dateSent }`.
- `fetchHistory`: when `cursor` is set, look up `` `${phone}|${pageSize}|${cursor}` `` first and
  return a copy on a hit. On a miss, build the page and store it unless a Twilio lookup failed.
  Never page-cache the first page.
- `nextCursor` pins both sources (R10), so a cached page can never go stale when new messages arrive.

### Template list and insight caching (User Stories 5–6, research R11/R12)
- `services/cacheService.js`: per-entry TTL on `set`; add `templateListCache` and `insightCache`.
- `services/whatsAppSender.js`: `fetchContentTemplates({ force })` with cache and in-flight sharing;
  clear the template cache after a successful delete.
- `routes/whatsapp_sender.js`: `/api/whatsapp/list` and `/api/twilio/approvals` accept `?refresh=1`; create
  clears the template cache; the three insight routes get a shared `parseInsightRange` (400 on bad dates)
  and `getOrComputeInsight(route, start, end, refresh, compute)`.
- Frontend: `TwilioTemplateDataGrid.tsx` and `WhatsApp.jsx` pass `refresh=1` on Refresh. Each of
  `WhastAppReport.tsx`, `WhastAppTypeReport.tsx` and `WhastAppAttendanceTypeReport.tsx` gets a Refresh button.

## Risks / Notes
- Sent-message ordering uses delivery-callback time for paging vs. Twilio `dateSent` for display (research R3): a few-seconds mismatch is possible only right at a page boundary.
- Generated-column index lookups require the migration in `sql_versions/20261106165300_add_twilio_generated_columns.sql` + `sql_versions/20261106165400_add_twilio_message_history_indexes.sql` to be applied on every environment *before* deploying (module-load `db.prepare` throws if columns are missing and would prevent the server from starting). Mention in deploy notes.
- Behavior change: the endpoint no longer returns full history without params.

## Complexity Tracking
No constitution violations; nothing to justify.
