# Contract: `POST /api/twilio/create-template`

**Feature**: `005-twilio-template-category` | **Status**: amended (backward compatible)
**Handler**: `routes/whatsapp_sender.js:198`

This endpoint already exists. This document is the **amended** contract; the only
change is the new optional `category` field and the `400` it can produce.
Everything else is stated so the contract is complete and reviewable on its own.

---

## Authorisation

`server.js:124` mounts `authorize.authorize_admin` on `/api/`, so an authenticated
admin session is required before the handler runs. The handler performs no
additional authorisation of its own. Unchanged.

---

## Request

`Content-Type: application/json`

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `friendly_name` | string | **yes** | — | Slugified by the client (lowercase, `_` separated) and reused as the approval `name` |
| `language` | string | **yes** | — | `en` or `de` from the form |
| `body` | string | **yes** | — | May contain `{{1}}` / `{{named}}` variables |
| `variable_examples` | string[] | no | `[]` | Positionally matched to variables in order of first appearance |
| `type` | string | no | `twilio/quick-reply` | One of `twilio/quick-reply`, `twilio/text`, `twilio/media` |
| `buttons` | `{title,id}[]` | no | `[]` | Used only for `twilio/quick-reply` |
| `media` | string \| string[] | conditional | `[]` | Required and non-empty for `twilio/media`; each item an `http(s)` URL or a `{{variable}}` |
| **`category`** | **string** | **no** | **`"MARKETING"`** | **NEW.** `"MARKETING"` or `"UTILITY"`, exact case |

### `category` semantics

- **Omitted, `null`, or empty string** → treated as `"MARKETING"`. This is what
  makes the change non-breaking: every existing caller keeps its current behaviour.
- **`"MARKETING"` or `"UTILITY"`** → forwarded verbatim to Twilio.
- **Anything else**, including `"AUTHENTICATION"`, `"utility"`, `"Marketing"`, a
  number, or an object → `400`. The check is fail-closed and runs **before** any
  Twilio call, so a rejected request creates nothing at Twilio.

### Example

```json
{
  "friendly_name": "ticket_ready_2026",
  "language": "de",
  "body": "Hallo {{1}}, hier ist Ihr Ticket für {{2}}.",
  "variable_examples": ["Hans Smith", "Sommerfest"],
  "type": "twilio/media",
  "buttons": [],
  "media": ["{{qr_code_url}}"],
  "category": "UTILITY"
}
```

---

## Responses

### `201 Created` — template created and submitted for approval

```jsonc
{
  "status": true,
  "template": { "sid": "HXxxxxxxxx", "friendly_name": "ticket_ready_2026", "…": "…" },
  "approval": {
    "name": "ticket_ready_2026",
    "category": "UTILITY",
    "content_type": "twilio/media",
    "status": "received",
    "rejection_reason": "",
    "allow_category_change": true
  }
}
```

`approval.category` is Twilio's echo and is **authoritative**; Meta may have
re-categorised the request (research R4). Consumers reporting a category to a human
must read it from here, not from what they sent.

If the content was created but the **approval submission** failed, the response is
still `201` and `approval` carries the error instead — pre-existing behaviour,
unchanged:

```jsonc
{ "status": true, "template": { "…": "…" }, "approval": { "error": { "…": "…" } } }
```

### `400 Bad Request`

| Condition | `message` |
|---|---|
| Missing `friendly_name`, `language`, or `body` | `friendly_name, language, and body are required` |
| Unknown `type` | `Unsupported template type: <value>` |
| **Unknown `category`** | **`Unsupported template category: <value>. Expected MARKETING or UTILITY`** |
| `twilio/media` with no media | `A media URL is required for twilio/media templates` |
| Malformed media entry | `Each media item must be an http(s) URL or a {{variable}} placeholder` |

All `400`s share the shape `{ "status": false, "message": "<above>" }` and are
returned before any outbound Twilio request.

**Ordering note**: the category check is placed immediately after the existing
`type` check, so a request that is wrong in both ways reports the `type` problem
first. This is arbitrary but fixed, and the quickstart asserts it.

### Twilio error passthrough

When `POST /v1/Content` fails, Twilio's own status code is mirrored:

```jsonc
{ "status": false, "message": "<twilio message>", "details": { "…": "…" } }
```

A category Twilio itself rejects would surface here rather than as a local `400`;
in practice the local enum check makes that unreachable for this endpoint's two
accepted values.

### `500 Internal Server Error`

`{ "status": false, "message": "Server error" }` — unexpected throw. Logged as
`` `${Date.now()} - Error in /api/twilio/create-template:` ``. Unchanged.

---

## Contract invariants

1. **A request without `category` behaves exactly as it did before this feature.**
   This is the compatibility guarantee and the first thing to re-test.
2. **An invalid `category` creates nothing.** Validation precedes both Twilio
   calls, so a `400` leaves no orphaned content resource behind.
3. **A valid `category` is never rewritten by this endpoint.** The route forwards
   it verbatim; only Meta may change it, and only downstream.
4. **The response shape does not change.** No consumer needs updating; the client
   change is a courtesy read of a field that was always there.

---

## Endpoints deliberately unchanged

| Endpoint | Why it needs no change |
|---|---|
| `GET /api/twilio/approvals` (`routes/whatsapp_sender.js:320`) | Already proxies Twilio's whole `whatsapp` approval object per SID, `category` included (research R8) |
| `DELETE /api/twilio/template/:contentSid` | Deletion is category-independent |
| `GET /api/whatsapp/list` | Lists content resources; category lives on the approval resource |
