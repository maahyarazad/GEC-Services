# Phase 1 Data Model: Selectable WhatsApp Template Category

**Feature**: `005-twilio-template-category` | **Date**: 2026-08-31

> **No database entities.** This feature adds no table, column, index or migration.
> Nothing in the application reads a template category (research R1), and the
> category lives at Twilio on the approval resource. The "data model" here is the
> shape of one new field as it travels from a form control to Twilio and back.

---

## 1. `TemplateCategory` — the new value

A closed enumeration of two members.

| Member | Wire value | Meaning to Meta | When an administrator picks it |
|---|---|---|---|
| Marketing | `"MARKETING"` | Promotions, offers, invitations, announcements — anything sent to grow or re-engage an audience. | Event invitations, "join us", save-the-dates, offers. This is the default. |
| Utility | `"UTILITY"` | A message about a specific, existing transaction, booking or account the recipient already has. | Registration confirmations, QR-code tickets to people already registered, reminders for a booking they made, status updates. |

**Excluded member**: `"AUTHENTICATION"`. Rejected by the endpoint with `400`.
It requires the `whatsapp/authentication` content type, which this form cannot
produce (research R3).

### Validation rules

| Rule | Enforced where | On violation |
|---|---|---|
| Value must be `MARKETING` or `UTILITY` | Server, in the route handler, before any Twilio call | `400` with `Unsupported template category: <value>` |
| Absent / empty / `null` → `MARKETING` | Server, as a default applied before validation | Silent, non-breaking (research R5) |
| Comparison is exact, case-sensitive, uppercase | Server | A lowercase `"utility"` is a `400`, not a coercion — the client always sends the canonical value |
| No relationship to `type` | — | None. All three content types are legal under both categories (research R7) |

The check is a fail-closed enum test placed alongside the existing
`SUPPORTED_TYPES` check at `routes/whatsapp_sender.js:206-210`, and follows its
shape exactly.

---

## 2. Client form state — `CreateTwilioTemplate`

One field is added to the `form` state object
(`public/src/components/Dashboard/WhatsApp/CreateTwilioTemplate.jsx:35`).

| Field | Type | Initial value | Reset value |
|---|---|---|---|
| `category` | `"MARKETING" \| "UTILITY"` | `"MARKETING"` | `"MARKETING"` |

**Both** the initial state and the post-success reset object must carry it. The
existing reset block already drifts from the initial state — it resets `media_url`
to `''` where the initial value is `'{{qr_code_url}}'` — so the two literals must
be updated independently rather than assumed identical.

**Submit gating**: `category` does **not** join `canSubmit`. A toggle group with an
enforced non-empty selection cannot reach an invalid state, so it can never be the
reason the button is disabled and must not appear in `submitDisabledReason`.

---

## 3. Request payload — `POST /api/twilio/create-template`

One added property. Everything else is unchanged.

```jsonc
{
  "friendly_name": "event_invite_2026",
  "language": "de",
  "body": "Hallo {{1}}, ...",
  "variable_examples": ["Hans Smith"],
  "type": "twilio/quick-reply",
  "buttons": [ { "title": "Teilnehmen", "id": "ATTEND" } ],
  "media": [],

  "category": "UTILITY"        // NEW — optional; omitted means "MARKETING"
}
```

**Compatibility**: the field is optional. A caller that omits it gets today's
behaviour byte for byte.

---

## 4. Outbound Twilio payload

The category changes exactly one value, in the second of the route's two Twilio
calls. The first call is untouched — content and approval are separate resources
at Twilio.

| Call | Body | Change |
|---|---|---|
| `POST /v1/Content` | `{ friendly_name, language, variables?, types }` | none |
| `POST /v1/Content/{sid}/ApprovalRequests/whatsapp` | `{ name, category }` | `category` becomes the validated request value instead of the literal `"MARKETING"` at line 302 |

---

## 5. Response — what the client is told back

The route's `201` body keeps its current shape. The `approval` object it already
returns is Twilio's, and carries the **authoritative** category:

```jsonc
{
  "status": true,
  "template": { "sid": "HX…", "friendly_name": "…" },
  "approval": {
    "name": "event_invite_2026",
    "category": "MARKETING",        // ← may differ from what was requested
    "content_type": "twilio/quick-reply",
    "status": "received",
    "rejection_reason": "",
    "allow_category_change": true
  }
}
```

### State transition: requested category → effective category

```text
   admin picks UTILITY
          │
          ▼
   route validates ──► 400 if not MARKETING | UTILITY
          │
          ▼
   Twilio accepts the approval request
          │
          ▼
   Meta reviews the body
          │
          ├─► approves as requested → approval.category === "UTILITY"
          ├─► re-categorises        → approval.category === "MARKETING"   (research R4)
          └─► rejects               → status "rejected" + rejection_reason
```

**Client rule**: the success snackbar names `approval?.category` when present, and
the requested category only as a fallback. It must never present the category the
administrator asked for as settled — the settled value arrives asynchronously and
is surfaced by the grid's existing approval column.

---

## 6. Entities deliberately **not** created

| Not created | Why |
|---|---|
| A `twilio_template_category` table | No reader anywhere in the application (research R1) |
| A `category` column on `twilio_template_message` | That table records *sends*; the category is a property of the template's approval, not of a send |
| A shared `CATEGORIES` constant module | Two literals in two files, in two module systems (ESM under `public/src`, CommonJS on the server), with no build-time sharing between them. A module here would be indirection, not reuse. |
