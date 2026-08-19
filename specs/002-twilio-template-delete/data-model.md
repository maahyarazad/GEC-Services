# Phase 1 Data Model: Twilio Template Delete & Grid Refresh

**Feature**: `002-twilio-template-delete` | **Date**: 2026-08-19

**No schema changes.** This feature reads one existing table and deletes a remote resource. Nothing is created, altered or migrated in `app.db`.

---

## Entities

### Twilio Content Template (remote — Twilio Content API)

Not stored locally. The grid is built live from `twilioClient.content.v1.contents.list({ limit: 100 })` in `fetchContentTemplates` (`services/whatsAppSender.js:561`).

| Field | Type | Notes |
|---|---|---|
| `sid` | string | Content SID, `HX…`. Primary identity; used as the DataGrid row `id`. |
| `friendlyName` | string | Shown in the confirmation dialog. |
| `language` | string | |
| `types` | object | Single key, e.g. `twilio/text`; drives the Type chip and the preview renderer. |
| `dateCreated` / `dateUpdated` | ISO string | |
| `url` | string | Deep link to the Twilio console. |

**Lifecycle**: created by `POST /api/twilio/create-template` → listed by `GET /api/whatsapp/list` → **deleted by `DELETE /api/twilio/template/:contentSid` (new)**.

**Deletion is permanent and remote.** There is no soft-delete, no tombstone, and no local copy to restore from.

---

### Template Send Record — `twilio_template_message` (local, read-only here)

The gate table. One row per message sent from a template.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | autoincrement |
| `messageSid` | VARCHAR(100) NOT NULL | Twilio message SID |
| `contentSid` | VARCHAR(100) NOT NULL | **the gate key** — matches Twilio template `sid` |
| `event_id` | INTEGER | nullable |

**Live volume**: 29,853 rows, all with a non-null `contentSid`.

**Written by**: `services/whatsAppSender.js:478` — `INSERT INTO twilio_template_message (messageSid, contentSid, event_id) VALUES (?, ?, ?)`, on every template send. This is why the check must be repeated server-side (plan D1).

**Read by** (all joins that would degrade if a referenced template were deleted):

| Location | Purpose |
|---|---|
| `routes/whatsapp_sender.js:524` | delivery logs grid |
| `routes/whatsapp_sender.js:720`, `:732`, `:745` | response logs / insight |
| `routes/whatsapp_sender.js:862` | insight by type |
| `services/whatsAppSender.js:618`, `:713` | sender-side lookups |

These resolve a display name by mapping `contentSid → friendlyName` against the live Twilio list. Deleting a referenced template does not break the SQL — it makes the name resolve to `null` for every historical row, permanently.

> **Note**: `create_tables.sql:77` defines `twilio_template_message_new`, which does not exist in `app.db`. The live table is `twilio_template_message`. Use the live name; do not follow the DDL file.

---

## Related but out of gate

Two other columns hold a content SID and are **not** checked, per the spec as given (see research R3):

| Table.column | Rows | Non-null | Meaning |
|---|---|---|---|
| `contact_book.contentSid` | 2,464 | 1,722 | last template associated with a contact (`routes/whatsapp_sender.js:333`) |
| `contact_book_events.contentSid` | 6,817 | 6,817 | template per contact/event pairing (`routes/whatsapp_sender.js:330`) |

A template with zero `twilio_template_message` rows but a non-zero count here would pass the gate and leave dangling references. The usage endpoint reports these counts so the dialog can warn and the gate can be tightened later.

---

## Validation Rules

| Rule | Where enforced | On violation |
|---|---|---|
| `contentSid` present, string, matches `^HX[0-9a-fA-F]{32}$` | both endpoints | `400` |
| `COUNT(*) FROM twilio_template_message WHERE contentSid = ?` is 0 | **DELETE handler** (authoritative) and usage endpoint (advisory) | `409` with count |
| Count query must succeed | both | `500`, no delete |
| Caller is an authenticated admin | `authorize_admin` via `server.js:105` | `401` |

## State Transitions

```text
                    ┌─────────────────────────────────────────┐
                    │  Template listed in grid                │
                    └───────────────┬─────────────────────────┘
                                    │ admin clicks delete
                                    ▼
                    ┌─────────────────────────────────────────┐
                    │  GET template-usage (pre-flight)        │
                    └───────┬───────────────────────┬─────────┘
                  count > 0 │                       │ count == 0
                  or error  ▼                       ▼
            ┌───────────────────────┐   ┌───────────────────────────┐
            │ Blocked — snackbar,   │   │ Confirmation dialog       │
            │ no dialog shown       │   └─────┬───────────────┬─────┘
            └───────────────────────┘  cancel │               │ confirm
                                              ▼               ▼
                                    ┌──────────────┐  ┌──────────────────────┐
                                    │ No change    │  │ DELETE (re-checks)   │
                                    └──────────────┘  └───┬──────────────┬───┘
                                                  409/500 │              │ 200
                                                          ▼              ▼
                                            ┌───────────────────┐  ┌──────────────────┐
                                            │ Blocked — error   │  │ Removed at Twilio│
                                            │ snackbar, no      │  │ → onRefresh()    │
                                            │ deletion          │  │ → drop approval  │
                                            └───────────────────┘  └──────────────────┘
```
