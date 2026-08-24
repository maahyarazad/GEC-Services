# Quickstart: WhatsApp Opt-Out Tracking Webhook

Manual verification steps for the three user stories in `spec.md`.

## US1 — Capture an opt-out

1. From a WhatsApp test number, send `STOP` to the Messaging Service.
2. Check `app.db`: `SELECT * FROM whatsapp_opt_outs WHERE phone = '<E.164 number>';`
3. A row should appear within a few seconds, with `keyword = 'STOP'` and a recent `opted_out_at` timestamp.
4. Repeat with an ordinary message (e.g. "hi") — no row should be created.

## US2 — No duplicate records on repeat opt-out

This can be verified directly against `services/optOutService.js` without sending real WhatsApp messages:

```js
const { recordOptOut } = require("./services/optOutService");

recordOptOut("+971501234567", "STOP");
recordOptOut("+971501234567", "UNSUBSCRIBE");
```

Then check the DB:

```sql
SELECT COUNT(*) FROM whatsapp_opt_outs WHERE phone = '+971501234567';
-- expect: 1

SELECT keyword, opted_out_at FROM whatsapp_opt_outs WHERE phone = '+971501234567';
-- expect: keyword = 'UNSUBSCRIBE' (the second call), opted_out_at updated to the later timestamp
```

The `UNIQUE` constraint on `phone` plus the `ON CONFLICT(phone) DO UPDATE` upsert in `recordOptOut` guarantee this — there is no separate dedup step to run.

## US3 — Outbound sends skip opted-out numbers

1. Insert a test number directly: `INSERT INTO whatsapp_opt_outs (phone, keyword, opted_out_at) VALUES ('+971501234567', 'STOP', strftime('%s','now') * 1000);`
2. Trigger an outbound send (e.g. `POST /api/whatsapp/send`) with a `phoneList` that includes `+971501234567` alongside other numbers.
3. Confirm no Twilio send is attempted for `+971501234567` (check Twilio logs / `twilio_delivery` table has no new entry for that number) while the other numbers in the list send normally.
4. Check `error_log` for an entry with `origin_function = "messageSender_optout_skip"` summarizing the skipped number(s) for that send.

## US4 — View the opt-out list in the dashboard

1. Open `admin?tab=whatsapp-broadcast` and log in as an admin with existing WhatsApp Broadcast access.
2. In the "Logs" section of the sidebar, click **Opt-Out List** (next to Response Logs / Delivery Logs / Event Logs).
3. With one or more rows in `whatsapp_opt_outs` (seed one via the US1/US2 steps above if needed), confirm the grid shows Phone, Keyword, and Opted Out At for each row.
4. Clear the table (or test against an environment where it's empty) and confirm the grid shows a "No rows" empty state rather than an error or a blank panel.
5. Use the grid's filter on the Phone column to search for a specific number and confirm only matching rows remain.
6. Sort by any column (e.g. Opted Out At) and confirm the order updates.

## FR-012 — Opt-out keyword parity check

`services/optOutService.js` exports `OPT_OUT_KEYWORDS` (currently `["STOP", "UNSUBSCRIBE", "CANCEL"]`). Periodically compare this list against the keyword list configured in Twilio Console → Messaging → Advanced Opt-Out settings for the WhatsApp sender's Messaging Service, and keep the two in sync — Twilio will still auto-enforce STOP handling on its side (21610) even if this list drifts, but our own store will under-report opt-outs if a Twilio-recognized keyword isn't also matched here.
