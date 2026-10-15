# Phase 1 Data Model: Event Template Dropdown (web_events)

This feature introduces **no new persisted entities and no schema changes**. It reads from an existing external table and seeds an existing form. Two entities are relevant: the external template source and the local event the modal already manages.

## Entity: Web Event Template (external, read-only)

Source: `web_events` table in the external MySQL database (via `services/mysqlService.js` → `getPool()`).

The endpoint returns a **normalised** shape so the frontend never depends on physical column names:

| API field | Type | Source (physical column — confirm on live schema) | Notes |
|---|---|---|---|
| `id` | number/string | `web_events.id` | Stable unique key for the dropdown option; never shown to the user. |
| `title` | string | `web_events.title` | The **only** value displayed in the dropdown. |
| `description` | string \| "" | `web_events.description` | Seeds the modal Description field; null → "". |
| `eventDate` | string \| null | `web_events.eventTime` (aliased) | Raw DB datetime; the frontend normalises it to `datetime-local` format. (`web_events` has no `event_date`; `eventTime` is the event date, `time` is the record-created timestamp.) |

**Validation / rules**:
- Read-only: the feature never INSERTs/UPDATEs/DELETEs `web_events`.
- Only the four columns above are selected and returned (no `SELECT *` to the browser).
- Rows are ordered by date (most recent first) for a sensible default list order.
- Physical column names are confirmed against the live schema during implementation; if they differ, only the SELECT aliases in the route change (see research.md R3).

## Entity: Event (local, existing — unchanged)

Source: local SQLite `events` table (`services/dbService.js`), created/edited by the modal and persisted via `POST`/`PUT /api/events`.

Form fields seeded by a template selection (existing `EMPTY_FORM` shape in `EventSection.jsx`):

| Form field | Seeded from template field | Format after seeding |
|---|---|---|
| `title` | `title` | string (as-is) |
| `description` | `description` | string (as-is, "" if null) |
| `event_date` | `eventDate` | `YYYY-MM-DDTHH:mm` (`datetime-local`); "" if unparseable |

**Rules**:
- Seeding only sets initial field values; all fields stay editable (FR-005).
- Existing validation is unchanged: `title` required, `event_date` required (`validate()` in the component).
- In Edit mode, the event `id` in `formData` is preserved when a template re-seeds the other fields (US2).

## Relationship

```
web_events (MySQL, many)        events (SQLite, many)
      │  template source                ▲
      │                                  │ created/edited via existing API
      └── selecting one seeds ───────────┘
          title, description, event_date
          (one-directional, read-only, no FK)
```

There is **no foreign key or stored link** between a created event and the `web_events` row it was seeded from; the dropdown is a convenience that copies values into the form at selection time.
