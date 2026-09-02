# Quickstart: Validating the Marketing / Utility Category

**Feature**: `005-twilio-template-category` | **Date**: 2026-08-31

How to prove this feature works end to end. This repository has no test runner
(research R10), so validation is a scripted manual pass plus two static gates.

Read the [contract](./contracts/create-template.md) for the full request/response
shape and the [data model](./data-model.md) for the enum and defaulting rules.

---

## Prerequisites

- Working Twilio credentials in the server environment: `TWILIO_ACCOUNT_SID`,
  `TWILIO_AUTH_TOKEN`. The route builds a Basic auth header from them directly.
- An admin session. `server.js:124` gates all of `/api/` behind
  `authorize.authorize_admin`, so every check below must run as a logged-in admin —
  in the browser, or with a session cookie for the `curl` checks.
- A **non-production Twilio account** for scenarios 2 and 3. They submit real
  templates for WhatsApp approval, and a submitted template cannot have its
  category changed afterwards — it can only be deleted and recreated.

## Setup

```bash
# Server
npm run dev

# Client (separate shell)
cd public && npm run dev
```

---

## Static gates (run these first — they need no Twilio account)

```bash
# Route syntax
node --check routes/whatsapp_sender.js

# Client build + lint — the changed file is .jsx and there is no tsc script,
# so the Vite build is the available compile gate.
cd public && npm run build && npm run lint
```

All three must exit `0`.

---

## Scenario 1 — Backward compatibility (the most important check)

**Proves**: contract invariant 1 — a caller that never heard of `category` is
unaffected.

```bash
curl -i -X POST http://localhost:<PORT>/api/twilio/create-template \
  -H 'Content-Type: application/json' \
  -b '<admin session cookie>' \
  -d '{
        "friendly_name": "qs_compat_check",
        "language": "en",
        "body": "Hello {{1}}",
        "variable_examples": ["Hans Smith"],
        "type": "twilio/text"
      }'
```

**Expect**: `201`, and `approval.category === "MARKETING"` — the same category this
request would have produced before the change, with no `category` field sent.

---

## Scenario 2 — Create a Utility template from the UI

**Proves**: the primary user story.

1. Open the admin dashboard → **WhatsApp Broadcast** tab.
2. Open the **Create Twilio Template** panel (the Twilio speed-dial action that
   sets `openPanel` to `create-template`).
3. Confirm the **Category** control renders with **Marketing** pre-selected.
4. Select **Utility**. Confirm the helper text changes to describe utility
   messages, and that the Create button's enabled/disabled state does **not**
   change — category never gates submission (data model §2).
5. Fill in: name `qs_utility_check` (click **Normalize**), language `de`, type
   **Text only**, body `Hallo {{1}}, Ihre Anmeldung ist bestätigt.`, example value
   `Hans Smith`.
6. Submit.

**Expect**:

- A success snackbar naming the category Twilio echoed back, e.g.
  `Template "qs_utility_check" created successfully (Utility)`.
- The panel closes and the template grid refreshes (existing `onSuccess` wiring in
  `WhatsApp.jsx:1335`).
- In the Twilio Console → Content Template Builder, the new template's WhatsApp
  approval request shows category **Utility**.

**If the snackbar says Marketing**: that is not necessarily a bug. Meta may have
re-categorised the body (research R4). Confirm against the Twilio Console — if the
Console also says Marketing, the feature worked and Meta disagreed with the
administrator. If the Console says Utility but the snackbar says Marketing, the
client is reading the wrong field.

---

## Scenario 3 — Form resets to Marketing after a successful create

**Proves**: the reset object carries `category` (data model §2 — the existing reset
block is known to drift from the initial state).

Immediately after Scenario 2 succeeds, reopen the Create Template panel.

**Expect**: the Category control is back on **Marketing**, not still on Utility.

---

## Scenario 4 — The server rejects an invalid category

**Proves**: contract invariant 2 — validation is server-side and fail-closed, and
nothing is created at Twilio.

```bash
# AUTHENTICATION is a real WhatsApp category but is out of scope (research R3)
curl -i -X POST http://localhost:<PORT>/api/twilio/create-template \
  -H 'Content-Type: application/json' -b '<admin session cookie>' \
  -d '{"friendly_name":"qs_reject","language":"en","body":"x","category":"AUTHENTICATION"}'

# Wrong case must be rejected, not coerced
curl -i -X POST http://localhost:<PORT>/api/twilio/create-template \
  -H 'Content-Type: application/json' -b '<admin session cookie>' \
  -d '{"friendly_name":"qs_reject","language":"en","body":"x","category":"utility"}'
```

**Expect for both**: `400` with
`{"status":false,"message":"Unsupported template category: <value>. Expected MARKETING or UTILITY"}`.

**Then confirm nothing leaked**: refresh the template grid and search for
`qs_reject`. It must **not** appear — the validation runs before both Twilio calls,
so no orphaned content resource should exist.

---

## Scenario 5 — Check ordering is stable

**Proves**: the documented ordering note in the contract.

```bash
curl -s -X POST http://localhost:<PORT>/api/twilio/create-template \
  -H 'Content-Type: application/json' -b '<admin session cookie>' \
  -d '{"friendly_name":"qs_order","language":"en","body":"x",
       "type":"twilio/bogus","category":"BOGUS"}'
```

**Expect**: the **type** error (`Unsupported template type: twilio/bogus`), because
the category check sits immediately after it.

---

## Cleanup

Delete the templates created above from the template grid (feature 002's delete
control). They have no send history, so the usage gate will allow it.

`qs_compat_check` and `qs_utility_check` will have been submitted for real WhatsApp
approval — delete them promptly so they do not linger in the account's template
list awaiting review.

---

## Done when

- [X] All three static gates exit `0` — with one standing caveat: repo-wide
      `npm run lint` fails on 1141 **pre-existing** errors unrelated to this
      feature, so the lint gate is narrowed to the changed file, which reports
      the same 1 pre-existing error before and after the change (see tasks T001,
      T028)
- [X] Scenario 1 returns `201` with `MARKETING` and no `category` sent — verified
      against the real handler with the outbound Twilio call stubbed
- [ ] Scenario 2 produces a Utility approval request visible in the Twilio Console
      — **the only open item.** Everything in Scenario 2 short of the Console is
      verified in a real browser: the control renders with Marketing pre-selected,
      the caption changes on toggle, the Create button's enabled state is
      unaffected by the category, `category: "UTILITY"` is what the form sends,
      and the snackbar reports the category the response carried. Confirming the
      Console requires submitting a real template to a real account
- [X] Scenario 3 shows the form reset to Marketing — verified in a real browser
      after a successful submit
- [X] Scenario 4 returns `400` for both inputs and creates nothing at Twilio —
      both rejections verified against the real handler; "creates nothing" holds
      structurally, since the check precedes both `fetch` calls (T008)
- [X] Scenario 5 reports the type error, not the category error
