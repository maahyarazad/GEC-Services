# Feature Specification: WhatsApp chat history — lazy loading on scroll-up

**Feature Branch**: `017-whatsapp-history-pagination`
**Created**: 2026-11-09
**Status**: Draft
**Input**: "In whatsAppSender.js I've optimized fetchHistory and added generated columns `body`, `media_url`, `media_type` on `twilio_responses`. It should fetch the latest 20 messages by default, and when the user scrolls up in the UI, load more until all messages are loaded." Clarified: each scroll-up loads **20** more (not 2).

## Background

`GET /api/whatsapp/history/:phone` currently returns the **entire** conversation. For every sent
message it makes one Twilio API call (`messages(sid).fetch()`) to get the body, so a long
conversation means dozens of Twilio calls before the Quick Reply modal shows anything.

## User Scenarios & Testing

### User Story 1 — Modal opens fast with the latest messages (P1)
Admin opens Quick Reply for a contact with 300 past messages. The chat shows the 20 most recent
messages, scrolled to the bottom, without waiting for the whole history.

**Independent test**: Open the modal for a long conversation; network tab shows one history call
returning 20 messages; at most 20 Twilio body fetches occur server-side.

### User Story 2 — Scrolling up loads older messages (P1)
Admin scrolls to the top of the chat. The next 20 older messages load and appear above, and the
view stays on the message they were reading (no jump). This repeats until the oldest message.

**Independent test**: With 45 messages, three loads occur (20, 20, 5); after the last, no further
requests are made and no spinner stays visible.

### User Story 3 — Conversation shorter than a page (P2)
A contact with 7 messages shows all 7 and never issues a "load more" request.

### User Story 4 — Reopening and scrolling are served from the server cache (P2)
Added 2026-11-09: "Add server caching to fetchHistory, since the history lives in the past and will not change."
An admin closes and reopens Quick Reply for the same contact, or scrolls back through pages already
loaded once. The server answers from memory: no Twilio calls for messages it has already fetched,
and older pages that were already built are returned as-is.

**Independent test**: Open a 200-message conversation and scroll to the end (N Twilio calls).
Close and reopen it and scroll to the end again: 0 Twilio calls, and the same messages in the same order.

### User Story 5 — Template list served from cache; Refresh reloads it (P2)
Added 2026-11-09: "use cacheService for fetchContentTemplates and clicking on the Refresh on the Admin UI will reset the cache for this section."
`fetchContentTemplates()` calls Twilio's content API on every use: the template grid, the delivery logs, the
insight report, quick reply, approvals and **every incoming WhatsApp reply** (`handleAutoResponse`). The
list changes only when a template is created or deleted, or edited in the Twilio console.

**Independent test**: open the WhatsApp admin page twice and send a quick reply: 1 Twilio `contents.list` call.
Click **Refresh** on the template grid: exactly 1 new call, and the grid shows a template newly added in the
Twilio console. Create or delete a template from the admin UI: the next list reflects it without Refresh.

### User Story 6 — Insight reports served from cache; each report has a Refresh (P3)
The three report modals (Delivery Status, Delivery Status by Contact Type, Attendance Status by Contact
Type) run heavy `json_extract` aggregate queries over `twilio_delivery` (≈150k rows) for each open and
each date change. Cache each result per report and date range. A new **Refresh** button in each modal
recomputes it.

**Independent test**: open a report twice with the same dates: the second open runs no SQL. Click
Refresh: the query runs again and new data shows. A range that includes today expires within 5 minutes
on its own.

### Edge cases
- Sent and received messages interleave; pages must be in strict chronological order with no
  duplicates or gaps across page boundaries, including messages with identical timestamps.
- A Twilio fetch fails for one sent message: the page still returns; that message is omitted
  (existing behaviour) and paging continues.
- A new message arrives while the modal is open: not required to appear live (out of scope).
- Invalid/garbled cursor → 400, UI shows error snackbar and stops loading more.
- Rapid scrolling must not fire duplicate requests for the same page.

## Requirements

- **FR-001**: History endpoint MUST return at most `limit` messages (default 20, max 50), the
  newest ones first selected, returned oldest→newest within the page.
- **FR-002**: Endpoint MUST accept an opaque `cursor` and return the next-older page, plus
  `hasMore` and `nextCursor`.
- **FR-003**: Twilio body lookups MUST only be made for sent messages on the requested page.
- **FR-004**: Paging MUST be stable: no message skipped or repeated across pages, ties included.
- **FR-005**: UI MUST load the next page when the user scrolls to the top, while `hasMore` is true,
  and MUST preserve the scroll position after older messages are prepended.
- **FR-006**: UI MUST show a small loading indicator at the top while loading, and nothing once
  everything is loaded.
- **FR-007**: First load MUST scroll to the bottom; later loads MUST NOT.
- **FR-008**: Existing message shape (`body`, `media_url`, `media_type`, `received_at`, `type`) is
  unchanged; a stable per-message `id` is added for React keys.

- **FR-009**: The server MUST cache the Twilio body/time of each sent message by `messageSid`.
  A message's content never changes, so entries need no invalidation; the cache is size-bounded.
- **FR-010**: The server MUST cache built *older* pages (requests with a `cursor`), keyed by phone,
  limit and cursor. The first (newest) page MUST NOT be page-cached, because new messages change it.
- **FR-011**: Failed Twilio lookups MUST NOT be cached, and a page containing one MUST NOT be
  page-cached, so a temporary Twilio error never hides a message for good.
- **FR-012**: An older page (any request with a cursor) MUST NOT change when new messages arrive.
  A cursor must therefore also pin a source no rows have been taken from yet. Caching depends on this.
- **FR-013**: Caching MUST be invisible to clients: same response shape, same results as uncached.

- **FR-014**: `fetchContentTemplates` MUST serve the template list from a server cache. Only successful
  lookups are cached, with a 10-minute TTL as a safety net for edits made in the Twilio console.
  Concurrent callers MUST share one in-flight Twilio request.
- **FR-015**: Creating a template (`POST /api/twilio/create-template`) or deleting one
  (`DELETE /api/twilio/template/:contentSid`) MUST clear the template cache after Twilio confirms.
- **FR-016**: The template grid's **Refresh** MUST force a fresh template list (`?refresh=1` on
  `GET /api/whatsapp/list` and `GET /api/twilio/approvals`).
- **FR-017**: `GET /api/whatsapp/insight`, `/insight-by-type` and `/attendance-insight-by-type` MUST cache
  their JSON `data` per route and normalized `start|end`. A range ending before today (UTC) keeps for 24 h;
  any other range keeps for 5 min. `?refresh=1` MUST recompute that entry and store it again.
- **FR-018**: Each report modal MUST have a **Refresh** button that re-requests with `refresh=1` and shows a
  spinner while loading. The response shape is unchanged.
- **FR-019**: Invalid `startDate`/`endDate` MUST return 400 instead of throwing `RangeError` into a 500 (today
  `new Date("x").toISOString()` throws), and MUST NOT create a cache entry.

## Success Criteria
- **SC-001**: Opening a 300-message conversation triggers ≤ 20 Twilio fetches (was ~150+).
- **SC-002**: Concatenating all pages equals the old full-history response (same messages, same order).
- **SC-003**: No visible scroll jump when older messages are prepended.

- **SC-004**: Reopening a conversation already loaded once makes 0 Twilio calls for those messages.
- **SC-005**: Repeating any cursor request returns a byte-identical response, before and after new
  messages arrive for that contact.

- **SC-006**: Opening the admin WhatsApp page and an insight report twice in a row makes ≤ 1 Twilio
  `contents.list` call and runs each insight query once.
- **SC-007**: After Refresh, the UI shows the current data on the first click.

## Out of scope
The existing date-range semantics of the insight queries are left as they are: `BETWEEN '<start>' AND '<end>'` compares
`'YYYY-MM-DD HH:MM:SS'` with `'YYYY-MM-DD'`, so the end day itself is excluded. Caching keeps
that behaviour; fixing it is a separate change.
Live updates of new messages, search within history, changing how sent bodies are sourced
(still Twilio), any change to the send/quick-reply flow.
