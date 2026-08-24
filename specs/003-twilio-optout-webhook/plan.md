# Spec: WhatsApp Opt-Out Tracking Webhook

## Problem
Twilio does not expose an API or report to retrieve opted-out numbers. We must capture and store opt-outs ourselves as they happen.

## Goal
When a user sends an opt-out keyword (STOP, UNSUBSCRIBE, CANCEL, etc.) to our WhatsApp-enabled Messaging Service, record that number in our own database so we can suppress future sends and query opt-out status on demand.

## Non-Goals
- Replacing Twilio's native STOP handling (Twilio still blocks sends and returns 21610 automatically).
- Building an opt-in flow (future spec).
- Handling opt-outs for channels other than the WhatsApp sender in this Messaging Service.

## Approach
1. **Webhook config**: In the Messaging Service's Integration settings, set Incoming Messages to "Send a webhook" pointing at a Twilio Function (or our own endpoint).
2. **Function logic**: On each inbound message, check the `Body` against our opt-out keyword list (case-insensitive).
3. **Storage**: If matched, write `{ from: <E.164 number>, keyword: <matched>, timestamp }` to a Twilio Sync List (or our primary DB, if we prefer not to depend on Sync).
4. **Idempotency**: Upsert by number — don't create duplicate entries if they opt out repeatedly.
5. **Pre-send check**: Before any outbound send, query our stored list and skip/flag numbers already opted out (backstop in addition to Twilio's native block + 21610 handling).

## Acceptance Criteria
**Status as of 2026-08-24**: Code for all six items is implemented and verified at the function/DB level (see spec.md's User Stories 1-3 and quickstart.md). None have been confirmed against a *live* Twilio Messaging Service yet — that requires an actual test WhatsApp number and console access, tracked as tasks.md T020/T031. Boxes below are left unchecked until that live pass happens; don't read "implemented" as "field-verified."
- [ ] Webhook is configured on the Messaging Service and confirmed receiving inbound WhatsApp messages. *(No code change needed — this is a Twilio Console configuration step + live confirmation, still pending.)*
- [ ] Sending "STOP" from a test WhatsApp number results in a new/updated entry in the Sync list (or DB) within a few seconds. *(Implemented: `routes/whatsapp_sender.js`'s `/webhooks/whatsapp` handler → `services/optOutService.js`. Verified directly against `app.db`; not yet verified via a live inbound WhatsApp message.)*
- [ ] Sending a non-keyword message does **not** create an entry. *(Implemented: `matchOptOutKeyword` requires an exact trimmed match — FR-002. Verified directly; not yet verified live.)*
- [ ] Duplicate STOP messages from the same number don't create duplicate records. *(Implemented: `UNIQUE` constraint + `ON CONFLICT DO UPDATE` upsert in `recordOptOut`. Verified directly — two calls with different keywords for the same number leave exactly one row.)*
- [ ] Outbound send logic checks this store before dispatching and skips known opted-out numbers. *(Implemented: `services/whatsAppSender.js`'s `safeSendMessage` calls `isOptedOut()` before every send; skips are aggregated and logged. Verified directly; not yet verified against a live outbound send.)*
- [ ] Opt-out keyword list here matches the keywords configured in Advanced Opt-Out (parity check). *(`OPT_OUT_KEYWORDS` in `services/optOutService.js` currently `["STOP", "UNSUBSCRIBE", "CANCEL"]` — needs a manual comparison against Twilio Console's Advanced Opt-Out settings; see quickstart.md.)*

## Also Implemented (added to spec.md after this plan was written)
- **User Story 4** — a read-only "Opt-Out List" view under the admin dashboard's WhatsApp Broadcast tab (`GET /api/whatsapp/optout-list`, `OptOutListPanel.jsx`), so staff can see who opted out without DB access. This plan document predates that addition; see spec.md for the full requirement (FR-013–FR-016) and tasks.md Phase 7-8 for the implementation breakdown.

## Open Questions
- ~~Sync List vs. our own DB~~ — **Resolved**: implemented against our primary SQLite DB (`whatsapp_opt_outs` table in `app.db`, via `services/optOutService.js`), not a Twilio Sync List. The app already has a DB with existing WhatsApp tables (`twilio_responses`, `error_log`, `contact_book`) to join against, and no Sync List dependency existed elsewhere in the codebase, so a DB table kept the implementation self-contained and consistent with the existing `db.exec`/`dbService` patterns used by other features (e.g. `routes/knowledge_base.js`).
- Do we also want to capture opt-*in* (START) events in the same webhook for symmetry? — Out of scope for this feature per spec.md's Assumptions (explicitly deferred as a future opt-in flow); not implemented.