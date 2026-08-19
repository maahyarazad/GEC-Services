# Quickstart: Validating Twilio Template Delete & Grid Refresh

**Feature**: `002-twilio-template-delete` | **Date**: 2026-08-19

How to prove the feature works end to end. There is no test runner in this repo (research R8), so validation is manual and scripted here.

> **Deletion is permanent at Twilio.** Every scenario below that deletes something deletes a template *you* created for the purpose. Never validate against a real template.

## Prerequisites

- `.env` populated with `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `VITE_SERVERURL`, `VITE_ADMIN_PASSWORD`
- `app.db` present at the repo root
- An admin session in the browser (log in at `/admin`)

## Setup

```bash
npm install          # if not already done
npm run dev          # or the project's usual start command
```

Open the dashboard, log in as admin, and go to the **WhatsApp Broadcast** section, template grid view.

---

## Static checks

Run after any change; both must pass before manual validation.

```bash
node --check routes/whatsapp_sender.js
node --check services/whatsAppSender.js
npx tsc --noEmit -p public/tsconfig.json    # adjust path if the project's tsconfig differs
```

---

## Scenario 1 — A used template cannot be deleted (spec US2)

The most important scenario. Run it first.

Pick a content SID that genuinely has send history:

```bash
node -e '
const db = require("better-sqlite3")("app.db", {readonly:true});
console.log(db.prepare("SELECT contentSid, COUNT(*) c FROM twilio_template_message GROUP BY contentSid ORDER BY c DESC LIMIT 3").all());
'
```

**In the UI**: find that template in the grid, click the delete icon.

**Expected**:
- No confirmation dialog appears.
- A snackbar reports the template is in use and states the send count.
- The template is still in the grid.

**Direct endpoint check** (browser devtools console, on the dashboard origin, so the session cookie is sent):

```js
await (await fetch(`${location.origin}/api/twilio/template-usage/HX…`, {credentials:'include'})).json()
// → { status: true, sendCount: 47, canDelete: false, related: {…} }
```

**Server-side gate check** — the critical one. Bypass the UI entirely and issue the DELETE for that same in-use SID:

```js
await (await fetch(`${location.origin}/api/twilio/template/HX…`, {method:'DELETE', credentials:'include'})).json()
// → 409, { status: false, sendCount: 47, … }
```

**Expected**: `409`, nothing deleted, and a `[TemplateDelete] DENIED — in use` line in the server log. If this returns `200`, the server-side gate is missing and the feature must not ship (see plan D1).

---

## Scenario 2 — An unused template can be deleted (spec US1)

**Create a throwaway template** via the section's Create Template flow — name it something unmistakable like `zz_delete_me_20260819`. Do **not** broadcast it.

Confirm it has no send history:

```bash
node -e '
const db = require("better-sqlite3")("app.db", {readonly:true});
console.log(db.prepare("SELECT COUNT(*) c FROM twilio_template_message WHERE contentSid = ?").get("HX…"));
// → { c: 0 }
'
```

**In the UI**: click the delete icon on that row.

**Expected**:
1. A confirmation dialog opens, naming the template and warning that deletion is permanent.
2. Cancel → dialog closes, nothing deleted, row still present. *(spec US1 scenario 3)*
3. Re-open, confirm → success snackbar, the grid refreshes, the row is gone.
4. The template is gone from the Twilio console too.
5. Server log shows `[TemplateDelete] GRANTED — deleted. sid=… name=…`.

---

## Scenario 3 — Fail-closed behaviour (spec US2 scenario 2, FR-008)

Confirm an unverifiable usage state blocks deletion rather than permitting it.

**Malformed SID**:

```js
await (await fetch(`${location.origin}/api/twilio/template/not-a-sid`, {method:'DELETE', credentials:'include'})).json()
// → 400, nothing deleted
```

**Simulated check failure**: temporarily rename the table read in the usage query (e.g. to `twilio_template_message_zzz`), restart, and retry a delete of an unused template.

**Expected**: `500`, no Twilio call, template still exists. Revert the change afterwards.

---

## Scenario 4 — Refresh (spec US3)

1. With the dashboard open on the template grid, create or delete a template in a **second browser tab**.
2. Return to the first tab. The grid still shows the stale list.
3. Click **Refresh** in the grid header.

**Expected**:
- The grid updates to match reality.
- Approval status chips re-populate (briefly showing spinners).
- The button is disabled while the refresh is in flight; rapid double-clicks do not issue duplicate requests. *(US3 scenario 2)*
- Styling matches the Support Center Refresh button — same size, same icon, no upper-casing.

**Both breakpoints**: repeat at a mobile width and a desktop width. `WhatsApp.jsx` renders the grid at two separate sites (`:1431`, `:1442`); a prop passed at only one leaves Refresh dead on the other (plan D4).

**Failure path**: stop the server, click Refresh.

**Expected**: previously loaded rows remain visible, failure is reported, the grid does not blank out. *(US3 scenario 3)*

---

## Scenario 5 — Authorisation (FR-007)

In a private window with **no** admin session:

```js
await fetch('https://<server>/api/twilio/template/HX…', {method:'DELETE', credentials:'include'})
// → 401, nothing deleted
```

Both new endpoints sit under `/api/` and inherit `authorize_admin` from `server.js:105`. Confirm the mount still covers them if that line is ever changed (plan, known gap 3).

---

## Scenario 6 — Grid state after delete (research R7)

1. Click a template row to select it and open the preview panel.
2. Delete that same template.

**Expected**: the preview panel closes, selection clears, and no stale template is rendered.

---

## Post-validation cleanup

- Remove any `zz_delete_me_*` templates left at Twilio.
- Revert the Scenario 3 table rename if not already done.
- Confirm `twilio_template_message` row count is unchanged from before validation — this feature must never delete from it:

```bash
node -e 'console.log(require("better-sqlite3")("app.db",{readonly:true}).prepare("SELECT COUNT(*) c FROM twilio_template_message").get())'
# → { c: 29853 }  (baseline as of 2026-08-19)
```

## Reference

- Endpoint shapes, status codes and logging: [contracts/template-delete.md](./contracts/template-delete.md)
- Table roles and the out-of-gate columns: [data-model.md](./data-model.md)
- Why the check is duplicated server-side: [plan.md](./plan.md) D1, [research.md](./research.md) R4
