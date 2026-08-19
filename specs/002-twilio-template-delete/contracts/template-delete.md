# Contract: Twilio Template Usage & Delete Endpoints

**Feature**: `002-twilio-template-delete` | **Date**: 2026-08-19

Both endpoints are added to `routes/whatsapp_sender.js` and mounted under `/api/`, so `authorize.authorize_admin` (`server.js:105`) applies to both without per-route middleware. An unauthenticated caller never reaches these handlers.

Responses follow the `{ status: boolean, ... }` convention already used throughout this router.

---

## 1. `GET /api/twilio/template-usage/:contentSid`

Reports how many records reference a template. **Advisory only** — it exists so the confirmation dialog can state the count before the administrator commits. It is not the gate.

### Request

| Param | In | Type | Constraint |
|---|---|---|---|
| `contentSid` | path | string | `^HX[0-9a-fA-F]{32}$` |

### Responses

**`200 OK`** — check completed

```json
{
  "status": true,
  "contentSid": "HXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "sendCount": 0,
  "canDelete": true,
  "related": {
    "contactBook": 0,
    "contactBookEvents": 0
  }
}
```

- `sendCount` — `COUNT(*)` from `twilio_template_message` for this SID. **This alone determines `canDelete`.**
- `canDelete` — `sendCount === 0`.
- `related` — advisory counts from `contact_book` and `contact_book_events`. **Not part of the gate** (research R3). Present so the dialog can warn and so the gate can be widened later without a contract change.

**`400 Bad Request`** — missing or malformed SID

```json
{ "status": false, "message": "A valid contentSid is required" }
```

**`500 Internal Server Error`** — the count could not be established

```json
{ "status": false, "message": "Failed to check template usage" }
```

The client MUST treat `500` as "not deletable" and MUST NOT open the confirmation dialog.

---

## 2. `DELETE /api/twilio/template/:contentSid`

Deletes a template from the Twilio content library. **This is the authoritative gate** — it re-runs the usage count as its first act, regardless of what the pre-flight returned.

### Request

| Param | In | Type | Constraint |
|---|---|---|---|
| `contentSid` | path | string | `^HX[0-9a-fA-F]{32}$` |

No body.

### Handler order (normative)

1. Validate `contentSid` shape → `400` on failure.
2. `SELECT COUNT(*) FROM twilio_template_message WHERE contentSid = ?`.
   - Query throws → log, `500`, **no Twilio call**.
   - `count > 0` → log denial, `409`, **no Twilio call**.
3. `deleteContentTemplate(contentSid)` → `twilioClient.content.v1.contents(sid).remove()`.
   - Rejects → log, `502`.
4. Log the grant. Respond `200`.

No local writes occur at any step.

### Responses

**`200 OK`** — deleted at Twilio

```json
{ "status": true, "contentSid": "HX…", "message": "Template deleted" }
```

**`409 Conflict`** — template has send history; **nothing was deleted**

```json
{
  "status": false,
  "sendCount": 47,
  "message": "This template has 47 recorded sends and cannot be deleted."
}
```

**`400`** — malformed SID (same shape as endpoint 1).

**`404 Not Found`** — Twilio reports no such template. Surfaced when Twilio returns HTTP 404; the row is stale, and the client should refresh the grid.

```json
{ "status": false, "message": "Template not found at Twilio" }
```

**`502 Bad Gateway`** — Twilio rejected or was unreachable; deletion state unknown, client should refresh

```json
{ "status": false, "message": "Twilio rejected the delete request" }
```

**`500`** — usage check failed; **nothing was deleted**

```json
{ "status": false, "message": "Failed to verify template usage" }
```

---

## Logging contract

Every attempt on the DELETE endpoint emits one line, matching the `${Date.now()} - [Tag]` format used by `routes/twilio_credentials.js` so it surfaces in the dashboard's Server Logs section:

| Outcome | Level | Line |
|---|---|---|
| Denied — in use | `warn` | `${Date.now()} - [TemplateDelete] DENIED — in use. sid=… count=… admin=… ip=…` |
| Denied — check failed | `error` | `${Date.now()} - [TemplateDelete] ERROR — usage check failed. sid=… admin=… ip=…` |
| Denied — Twilio error | `error` | `${Date.now()} - [TemplateDelete] ERROR — Twilio remove failed. sid=… admin=… ip=…` |
| Granted | `log` | `${Date.now()} - [TemplateDelete] GRANTED — deleted. sid=… name=… admin=… ip=…` |

Admin identity resolves as `req.user?.username || req.user?.email || req.user?.role || "unknown-admin"`, matching `routes/twilio_credentials.js:71`.

---

## 3. Service-layer contract

`services/whatsAppSender.js` — replaces the dead `deleteContent(req, res)` stub (`:573`) and is added to `module.exports`.

```js
/**
 * Deletes a content template from the Twilio content library.
 * Transport-agnostic: takes a SID, returns the file's standard result shape.
 * Callers own the usage gate — this function does not check anything.
 *
 * @param {string} contentSid
 * @returns {Promise<{status: boolean, result: unknown}>}
 */
const deleteContentTemplate = async (contentSid) => { … }
```

- Resolves `{ status: true, result: true }` on success.
- Resolves `{ status: false, result: error }` on failure — never throws, matching `fetchContentTemplates`.
- Performs **no** authorisation and **no** usage checking. The route is responsible for both.

---

## Client-side contract

`TwilioTemplateDataGrid.tsx` gains one required prop:

| Prop | Type | Purpose |
|---|---|---|
| `onRefresh` | `() => void \| Promise<void>` | Re-fetches the template list. Wired to `WhatsApp.jsx`'s existing `fetchData`. Must be passed at **both** render sites (`WhatsApp.jsx:1431` and `:1442`). |

Refresh activation awaits `onRefresh()` and the grid's local `fetchApprovals()` together, with the button disabled while in flight.
