# API Contract: Unsubscribed Contacts

**Feature**: `006-unsubscribe-contacts-list` | **Date**: 2026-09-07

Two new endpoints on the existing `routes/contact_book.js` router (already registered via
`routes.js:26,58`). Both follow the response envelope used by the sibling contact endpoints:
`{ status: boolean, ... }`.

> **Route ordering constraint**: Express matches in declaration order, and this router already has
> a `GET /api/contacts/:id(\d+)` at line 23. The new literal paths below sit under
> `/api/unsubscribe-contacts`, a distinct prefix, so they cannot be shadowed by the `/api/contacts`
> parameterised routes. Do **not** nest them under `/api/contacts/...`.

---

## `GET /api/unsubscribe-contacts`

Lists unsubscribe records, LEFT JOINed to `contact_book`, with server-side pagination, sorting and
filtering.

### Query parameters

Handled by `dbService._QuerySqlConverter` — identical semantics to `GET /api/contacts`.

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | string (1-based) | `"1"` | Converted internally to 0-based `pageNumber` |
| `pageSize` | string | `"10"` | Grid sends 25 / 50 / 100 |
| `sortField` | string | `uc.id` | Must be a qualified or projected column |
| `sortOrder` | `asc` \| `desc` | `desc` | Newest opt-outs first by default |
| `filterField` | string | — | Sent with `filterOperator` + `filterValue` |
| `filterOperator` | string | — | `contains`, `equals`, `startsWith`, `endsWith`, `eq`, `neq`, `gt`, `gte`, `lt`, `lte` |
| `filterValue` | string | — | |

### Behaviour

- Base table `unsubscribe_contacts AS uc`.
- `leftJoin: { table: "contact_book AS cb", on: "cb.phone = uc.phone" }`.
- Explicit column projection with `uc.id AS id` and `cb.id AS contact_id` (see `data-model.md`).
- Total count computed over the **same** join, so pagination cannot disagree with the rendered rows.

### `200 OK`

```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "phone": 971585831595,
      "created_at": "2026-09-03 13:02:38",
      "contact_id": 1301,
      "title": null,
      "first_name": "Maahyar",
      "last_name": "Azad",
      "gender": null,
      "language": "en",
      "type": "gec_staff",
      "club_partner_name": null,
      "blacklist": 0
    },
    {
      "id": 2,
      "phone": 491701234567,
      "created_at": "2026-09-05 09:12:00",
      "contact_id": null,
      "title": null,
      "first_name": null,
      "last_name": null,
      "gender": null,
      "language": null,
      "type": null,
      "club_partner_name": null,
      "blacklist": null
    }
  ],
  "total": 2,
  "page": 1,
  "pageSize": 25
}
```

The first row is the real shape returned by the verified query in `research.md` R3. The second
illustrates the **unmatched** case that makes the LEFT JOIN necessary — every `cb.*` field is
`null`, including `first_name`, which is `NOT NULL` on the base table.

`phone` is a JSON **number** without the `+`. Clients format for display; they must not treat it as
E.164 text.

### `500 Internal Server Error`

```json
{ "status": false, "message": "Failed to fetch unsubscribe contacts" }
```

---

## `DELETE /api/unsubscribe-contacts`

Hard-deletes one row from `unsubscribe_contacts`. Irreversible.

### Request

```json
{ "id": 1 }
```

`id` is `unsubscribe_contacts.id` — **never** `contact_id`. Body-in-DELETE matches the existing
`DELETE /api/contacts` convention in this router.

### Behaviour

- `dbService.remove("unsubscribe_contacts", id)` → `DELETE FROM unsubscribe_contacts WHERE id = ?`.
- `contact_book` is **not** touched. No cascade exists (the table has no foreign keys).
- Side effect: the phone stops being excluded by the broadcast filters at
  `services/whatsAppSender.js:150` and `:174`, so it re-enters the audience on the next send.

### `200 OK`

```json
{ "status": true, "message": "Unsubscribe record deleted successfully" }
```

### `400 Bad Request` — missing or non-numeric `id`

```json
{ "status": false, "message": "ID is required" }
```

### `404 Not Found` — `changes === 0`

```json
{ "status": false, "message": "Unsubscribe record not found" }
```

Returned when the row was already deleted (e.g. by a concurrent operator). Must not 500.

### `500 Internal Server Error`

```json
{ "status": false, "message": "Failed to delete unsubscribe record" }
```

---

## Authorization

Both endpoints are planned **without** route-level middleware, matching `GET /api/contacts`
(line 225) and `DELETE /api/contacts` (line 152) in the same router.

⚠ **Open decision — see `research.md` R6.** This adds a hard-delete endpoint to a router where
`authorization_middleware` is imported but applied to only one of ~18 routes. If operator-only
access is intended, apply `authorization_middleware.authorize_operator` — preferably across the
whole router rather than to these two routes alone, since the existing contact hard-delete is
strictly more destructive and is currently unguarded.

---

## Frontend contract

### New panel

| Concern | Value |
|---|---|
| Panel id (`openPanel` / `?view=`) | `unsubscribed` |
| Opened by | `handleSetOpenPanel('unsubscribed')` (`WhatsApp.jsx:928`) |
| Container | `SlideMenu` (`research.md` R5) |
| Header title | `Unsubscribed Contacts` |
| Button placement | "Manage Data" group, after Contact Book / Guest List / Event List (`WhatsApp.jsx:1330-1338`) |
| Grid | `CustomDataGrid` in server mode: `filterMode`/`sortingMode`/`paginationMode` = `"server"`, plus `rowCount`, `paginationModel`, `sortModel`, `filterItems` and their change handlers |

### Grid columns

| Field | Header | Notes |
|---|---|---|
| `phone` | Phone | Rendered as `+${phone}` |
| `name` | Name | Derived from `title`/`first_name`/`last_name`; shows a "No matching contact" indicator when `contact_id` is null |
| `type` | Type | Blank when unmatched |
| `language` | Language | |
| `club_partner_name` | Club / Partner | |
| `created_at` | Unsubscribed At | |
| `actions` | Actions | `renderCell` → `UnsubscribeActionCell` |

### `UnsubscribeActionCell`

A new cell component modelled on `ActionCell.tsx` but carrying **only** the delete action —
`TbTrashX`, colour `#d32f2f`, hover `#ffebee`, tooltip "Remove from Unsubscribe List".

```ts
interface UnsubscribeActionCellProps {
  params: { row: UnsubscribeRow };
  onDeleteUnsubscribe: (row: UnsubscribeRow) => void;
}
```

It deliberately does not reuse `ActionCell`, which hard-requires `onModifyContact`,
`onSwitchBlacklist`, notepad and `EventSpeedDial` props that are meaningless here
(`research.md` R7).

### Delete flow

Mirrors `onDeleteContact` / `deleteContact` (`WhatsApp.jsx:368-419`):

1. `onDeleteUnsubscribe(row)` → `openDialog(body, 'Remove from Unsubscribe List', { text: 'Remove', color: 'error' }, onConfirm, onCancel)`.
2. The confirmation body must state the action is a permanent removal and that the person will
   receive broadcasts again.
3. On confirm → `deleteUnsubscribe(row.id)`: `fetch(DELETE, credentials: 'include', body { id })`,
   `showSnackbar` on failure, then re-fetch the grid page.
