# Phase 1 Data Model: Admin Knowledge Base

**Feature**: `001-admin-knowledge-base` | **Date**: 2026-08-18

Two of the spec's four entities are compile-time constants, and two are runtime data. That split is
the direct consequence of FR-017 fixing the catalogue in code.

| Spec entity | Lives as | Persisted? |
|---|---|---|
| Knowledge Base Topic | Frozen object in `knowledgeBase.catalog.js` | No — ships with the release |
| Jump Destination | Field on a topic object | No |
| Tutorial Video | Field on a topic + a file on disk | File only |
| Topic View Event | Row in `knowledge_base_view_log` (SQLite) | Yes |

---

## 1. Knowledge Base Topic *(compile-time)*

Defined in `public/src/components/Dashboard/KnowledgeBase/knowledgeBase.catalog.js`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Stable kebab-case key. Used in telemetry, so it must not be reworded when a title is. |
| `title` | string | yes | Plain-language, administrator's vocabulary. Matched by search. |
| `summary` | string | no | One line on what the administrator will learn. Matched by search. |
| `sectionSlug` | string | yes | The `?tab=` slug this topic belongs to. Groups the catalogue. |
| `destination` | Jump Destination | yes | Where this topic's own jump control goes. |
| `video` | Tutorial Video \| `null` | yes | `null` means not yet recorded (FR-010). |
| `durationLabel` | string | no | E.g. `"4 min"`. Absent when `video` is `null`. See research R7. |
| `order` | number | yes | Display order within its section group. |
| `subTopics` | Topic[] | no | Present only on the WhatsApp Broadcast topic at launch. |

**Validation rules**

- `id` unique across the whole catalogue, sub-topics included — telemetry keys off it.
- `sectionSlug` must equal `slugify(label)` for some entry in `Dashboard.jsx` `tabConfig`. A slug with
  no matching tab would send the administrator to a blank section (spec edge case: renamed/removed
  section).
- A topic with `video: null` must not render an enabled view-video control (FR-010).
- Nesting is one level. A sub-topic must not itself carry `subTopics`.
- `durationLabel` without a `video` is a content error; a `video` without `durationLabel` degrades
  gracefully (the label is simply omitted).

**Launch content** — 6 top-level topics, 4 sub-topics under the first:

| `id` | Section | Destination |
|---|---|---|
| `whatsapp-broadcast` | `whatsapp-broadcast` | section root |
| ├ `whatsapp-twilio-templates` | `whatsapp-broadcast` | `view=create-template` |
| ├ `whatsapp-auto-response` | `whatsapp-broadcast` | `view=event-list` |
| ├ `whatsapp-guest-list` | `whatsapp-broadcast` | `view=guest-list` |
| └ `whatsapp-contact-to-guest` | `whatsapp-broadcast` | `view=contact-book` |
| `whatsapp-reporting` | `whatsapp-broadcast` | `view=report` |
| `place-id-finder` | `place-id-finder` | section root |
| `pdf-generator` | `pdf-generator` | section root |
| `registration-internal` | `registration-config` | section root |
| `registration-external` | `registration-config` | section root |

---

## 2. Jump Destination *(compile-time)*

| Field | Type | Required | Notes |
|---|---|---|---|
| `label` | string | yes | Shown in the picker. Omitted from the UI when there is only one destination. |
| `tab` | string | yes | The `?tab=` slug. |
| `view` | string \| `null` | yes | The `?view=` panel, or `null` for the section root. |

Resolves to `/admin?tab={tab}` when `view` is null, otherwise `/admin?tab={tab}&view={view}`, with
`&from=knowledge-base` appended so the target can offer a way back (FR-009, research R4).

**Validation rules**

- When `view` is non-null and `tab` is `whatsapp-broadcast`, `view` must be a key of `panelMap` in
  `WhatsApp.jsx:958-970`. Two keys — `create-template` and `event-logs` — must be added there first;
  until then those URLs are silently inert rather than erroring, which is exactly the failure mode
  worth guarding against in review.
- No other section currently reads `?view=`, so `view` must be `null` for every non-WhatsApp topic.

**Selection behaviour (FR-018)**

- Topic with no `subTopics` → one destination → the jump control navigates immediately.
- Topic with `subTopics` → the picker offers the parent's own destination **plus** each sub-topic's,
  parent first. The parent option is never dropped (spec edge case: admin wants the overview).

---

## 3. Tutorial Video *(file on disk + compile-time reference)*

| Field | Type | Required | Notes |
|---|---|---|---|
| `videoId` | string | yes | Opaque key. Maps to a filename via the catalogue, never taken from the URL. |
| `filename` | string | yes | Basename within `file_storage/knowledge_base/`. |

**Validation rules**

- `videoId` unique across the catalogue.
- Resolution is catalogue-driven: the server looks `:videoId` up in the known set and 404s on a miss.
  Because the request parameter never reaches the filesystem path, traversal is structurally
  impossible rather than filtered out (research R3).
- The resolved path must sit inside `file_storage/knowledge_base/`; assert it after resolution as a
  second, cheap line of defence.
- A catalogue entry naming a file that is not on disk yields 404, and the client shows "video
  unavailable" without breaking the rest of the catalogue (FR-011).
- Files are **not** committed to the repository — they are placed on the server by hand.

**State**: `recorded` (a `video` object is present and the file exists) or `not yet recorded`
(`video: null`). There is no intermediate state; a missing file for a declared video is an error
surfaced to the administrator, not a status.

---

## 4. Topic View Event *(persisted)*

SQLite table in the existing `app.db`, declared in `create_tables.sql`, written through
`services/dbService.js`.

```sql
CREATE TABLE IF NOT EXISTS knowledge_base_view_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id    TEXT    NOT NULL,
    event_type  TEXT    NOT NULL CHECK (event_type IN ('topic_opened', 'video_played')),
    admin_user  TEXT,
    created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kb_view_log_topic   ON knowledge_base_view_log (topic_id);
CREATE INDEX IF NOT EXISTS idx_kb_view_log_created ON knowledge_base_view_log (created_at);
```

| Column | Notes |
|---|---|
| `topic_id` | The catalogue `id`. Not a foreign key — the catalogue is code, not a table. |
| `event_type` | Two kinds are enough to answer FR-015: it was opened, and the video was played. |
| `admin_user` | Identifier from the verified JWT (`req.user`), never from the request body. |
| `created_at` | Epoch milliseconds, matching the `Date.now()` convention used in this project's logs. |

**Validation rules**

- `topic_id` is accepted only if it exists in the catalogue's known id set; unknown ids are rejected
  rather than logged, so the table cannot be used as arbitrary storage by a stray client.
- Writes are best-effort: a telemetry failure must never block playback or navigation (FR-011 spirit).
- No retention policy is defined for the initial release; the table is small (a handful of admins,
  ten topics) and pruning can be added if it ever matters.

**Relationships**: `knowledge_base_view_log.topic_id` → Knowledge Base Topic `id`, by convention and
enforced in application code, since one side of the relation does not live in the database.
