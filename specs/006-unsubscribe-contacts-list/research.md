# Phase 0 Research: Unsubscribed Contacts Panel

**Feature**: `006-unsubscribe-contacts-list` | **Date**: 2026-09-07

All findings below were verified against the live `app.db` and the current source tree, not
assumed. Line references are to the state of the repo at the time of writing.

---

## R1. The phone join is affinity-dependent (highest-risk finding)

**Question**: Can `unsubscribe_contacts` be LEFT JOINed to `contact_book` on `phone` directly?

**Finding**: Yes, today — but by accident of SQLite type affinity, not by design.

| Table | Column | Declared type | Stored as |
|---|---|---|---|
| `unsubscribe_contacts` | `phone` | `INTEGER NOT NULL UNIQUE` | integer, e.g. `971585831595` |
| `contact_book` | `phone` | `VARCHAR(50)` | text, e.g. `'+971585831595'` |

The writer at `services/whatsAppSender.js:867-868` inserts `from`, which is
`From.replace("whatsapp:", "")` → `'+971585831595'` (a string, with the `+`). Because the target
column has INTEGER affinity, SQLite silently coerces it to the integer `971585831595`, **dropping
the leading `+`**.

On comparison, INTEGER affinity is likewise applied to the TEXT side, so `cb.phone = uc.phone`
resolves. Verified empirically against `app.db`:

- naive join `ON cb.phone = uc.phone` → matches
- explicit cast join `ON cb.phone = ('+' || CAST(u.phone AS TEXT))` → matches identically
- `contact_book`: 2461 rows, of which **1** has a phone that will not coerce cleanly
  (`"+4917632351894‬"` — contains a trailing U+202C POP DIRECTIONAL FORMATTING character)
- the existing broadcast exclusion `cb.phone NOT IN (SELECT uc.phone ...)`
  (`services/whatsAppSender.js:150,174`) does correctly exclude the unsubscribed row today

**Decision**: Use the plain `ON cb.phone = uc.phone` join.

**Rationale**: It matches what the production broadcast filter already relies on, so the panel
shows exactly the exclusion set the sender actually applies. Introducing a different, "more
correct" normalisation here would make the panel disagree with the broadcast behaviour — the
panel would show a row as matched that the sender treats as unmatched, or vice versa. Consistency
with the live exclusion logic is worth more than local correctness.

**Alternatives considered**:
- *Cast/normalise in the join* (`'+' || CAST(uc.phone AS TEXT)`) — rejected for this feature: it
  diverges from the sender's own comparison and would mask the underlying schema problem.
- *Fix the schema* (`phone TEXT` + backfill + normalising writes) — this is the real fix, but it
  touches the broadcast exclusion path and the auto-response writer. Recorded in `spec.md` as out
  of scope and recommended as a **separate follow-up**, so this feature does not carry a data
  migration.

**Consequence to carry into implementation**: `uc.phone` arrives in JSON as a **number**
(`971585831595`), not a `+`-prefixed string. The grid must format it for display
(e.g. render `+${phone}`) rather than assume E.164 text. The magnitude (~9.7e11) is far below
`Number.MAX_SAFE_INTEGER`, so no precision loss.

---

## R2. `dbService` already supports LEFT JOIN — no new query layer needed

**Finding**: `services/dbService.js` has first-class join support already used in production:

- `_QuerySqlConverter(query, table_name, leftJoin, columns)` — `services/dbService.js:531`
- `_getTotalCount(table, filters, advancedClauses, leftJoin)` — `services/dbService.js:621`
- `_getAll(table, filters, { columns, leftJoin: { table, on }, ... })` — `services/dbService.js:643`

Existing precedent to copy: `routes/partner_onboarding.js:243-258` joins
`partner_onboarding_data AS pod` to `member_card AS mc` with explicit
`columns: ["pod.*", "mc.id AS member_card_id"]`.

**Decision**: Reuse `_QuerySqlConverter` / `_getTotalCount` / `_getAll` with
`leftJoin: { table: "contact_book AS cb", on: "cb.phone = uc.phone" }`.

**Rationale**: Gives server-side pagination, sorting and operator-aware filtering for free, on the
identical code path the Contact Book grid uses — which is exactly what "use the same components"
implies on the backend side.

**Alternatives considered**: hand-rolled `db.prepare` query (as `contactBookData` does) — rejected;
it would re-implement pagination and filtering that already exist and are already exercised.

---

## R3. Column aliasing is mandatory (both tables have `id` and `phone`)

**Finding**: `contact_book` and `unsubscribe_contacts` both declare `id` and `phone`. `SELECT *`
across the join would let `cb.id` overwrite `uc.id` in the result object, and the delete action
would then target the wrong table's primary key — silently deleting the wrong thing or 404ing.

**Decision**: Select explicitly, aliasing `uc.id AS id` (grid row identity + delete key) and
`cb.id AS contact_id` (display/reference only).

**Verified query** (run against `app.db`, returns the enriched row correctly):

```sql
SELECT uc.id AS id, uc.phone AS phone, uc.created_at,
       cb.id AS contact_id, cb.first_name, cb.last_name,
       cb.type, cb.language, cb.blacklist
FROM unsubscribe_contacts AS uc
LEFT JOIN contact_book AS cb ON cb.phone = uc.phone
ORDER BY uc.id DESC;
```

**Rationale**: FR-009 depends on this. It is the single most likely source of a data-loss bug in
this feature.

---

## R4. Row multiplication risk from the LEFT JOIN

**Finding**: `contact_book.phone` has **no** UNIQUE constraint (`create_tables.sql:57`). Verified
current data: **0 duplicate phones** across 2461 rows, so the join is 1:1 today and
`_getTotalCount` over the join equals the `unsubscribe_contacts` row count.

**Decision**: Proceed with the plain join, and count over the same join so the total always matches
the rows actually rendered.

**Rationale**: Counting over the joined shape rather than over `unsubscribe_contacts` alone keeps
pagination honest if a duplicate phone is ever introduced — the pager will not disagree with the
grid. This is why `_getTotalCount` must be passed the same `leftJoin`.

**Alternatives considered**: `GROUP BY uc.id` or a correlated subquery to force 1:1 — rejected as
premature for zero current duplicates, and it would defeat `_getTotalCount`'s simple COUNT path.

---

## R5. UI pattern — `SlideMenu`, not `SlideModalProvider`

**Question**: The request says "slideModal"; which component is actually the Contact Book pattern?

**Finding**: Two different mechanisms exist, and the name is ambiguous:

| Component | Where used |
|---|---|
| `SlideMenu` (`public/src/components/SlideMenu/SlideMenu.jsx`) | The Contact Book panel and every sibling panel — `WhatsApp.jsx:1174` (`contact-book`), `:1224` (`guest-list`), `:1241` (`event-logs`), `:1249` (`event-list`) |
| `SlideModalProvider` / `useSlideModal` (`public/src/components/Providers/SlideModalProvider.jsx`) | Only `public/src/components/Sections/SurveyDataGrid.jsx:116` |

**Decision**: Use `SlideMenu`, driven by the existing `openPanel` state and `handleSetOpenPanel`
(`WhatsApp.jsx:928`), with a new panel id `unsubscribed`.

**Rationale**: The user asked for "the same components used for other sections like contact Book" —
the Contact Book demonstrably uses `SlideMenu`. `handleSetOpenPanel` also syncs the panel to the
`?view=` URL query param, so the panel becomes linkable/refreshable like every other panel. Using
`SlideModalProvider` instead would produce a panel that behaves differently from its neighbours
and loses URL state.

---

## R6. Authorization posture is inconsistent on the contacts routes — flagged, not resolved

**Finding**: `routes/contact_book.js` imports `authorization_middleware` at line 4, but applies it
to exactly **one** of its ~18 routes (`/contacts/:id(\d+)` at line 483). The routes this feature
mirrors — `GET /api/contacts` (line 225) and `DELETE /api/contacts` (line 152) — carry **no**
route-level authorization middleware.

**Decision**: Match the surrounding convention (no route-level middleware) so this feature does not
introduce a lone inconsistent route, **and** surface the gap explicitly rather than silently
inheriting it.

**Rationale**: Adding auth to only the new endpoints would not secure the existing hard-delete on
`/api/contacts`, which is a strictly more destructive operation and is already unguarded. The gap
is pre-existing and systemic; fixing it belongs in its own change across all contact routes.

**⚠ CORRECTION (2026-09-07, at implementation time)**: the framing above was wrong about *which*
guard applies. `authorize_operator` reads the **`o-usr`** cookie, set only by `POST /operator/login`
for the Event Registration page. The dashboard hosting the WhatsApp Broadcast section authenticates
via `POST /registration-config-access`, which sets **`a-usr`** with `role: "admin"`. Applying
`authorize_operator` would have 401'd the panel. The correct guard is `authorize_admin`.

**Resolved**: both new endpoints are guarded with `authorization_middleware.authorize_admin`.
The existing unguarded sibling routes were left untouched. See `plan.md` → "Resolved:
Authorization on the New Endpoints".

---

## R7. Confirm-then-delete flow already exists — copy it verbatim

**Finding**: The Contact Book delete is a two-part pattern in `WhatsApp.jsx`:

- `onDeleteContact(row)` (`:402-419`) calls `openDialog(...)` from `AlertProvider` with a warning
  body, a title, an `{ text: 'Delete', color: 'error' }` action, and an on-confirm callback.
- `deleteContact(id)` (`:368-400`) `fetch`es with `method: 'DELETE'`, `credentials: 'include'`,
  a JSON `{ id }` body, calls `showSnackbar(...)` on failure, then re-fetches the grid data.

The delete icon itself lives in `ActionCell.tsx` (`TbTrashX`, red `#d32f2f`, hover `#ffebee`),
wired through `onDeleteContact` and assembled by `contactBookColumn(...)` in
`WhatsAppComponentConfig.jsx`.

**Decision**: Mirror this structure exactly for the unsubscribe panel — a dedicated
`UnsubscribeActionCell` with only the delete icon, and `onDeleteUnsubscribe` / `deleteUnsubscribe`
handlers shaped like their Contact Book counterparts.

**Rationale**: Satisfies FR-006 with the confirmation UX operators already know, and keeps the
destructive action visually identical to the other destructive action in the same section.

**Alternatives considered**: reusing `ActionCell` directly — rejected; it hard-requires
`onModifyContact`, `onSwitchBlacklist`, notepad and `EventSpeedDial` props that have no meaning
for an unsubscribe row.

---

## R8. Backend delete primitive already exists

**Finding**: `dbService.remove(table, id)` (`services/dbService.js:175-180`) issues
`DELETE FROM <table> WHERE id = ?` and returns `{ changes }`. `DELETE /api/contacts`
(`routes/contact_book.js:152-177`) uses it and maps `changes === 0` → HTTP 404.

**Decision**: `dbService.remove("unsubscribe_contacts", id)` with the same 404-on-zero-changes
mapping. This is a genuine hard delete, satisfying FR-007.

**Rationale**: No new persistence code required; the table has no foreign keys pointing at it, so
no cascade or referential cleanup is involved.

---

## Resolved unknowns

| Unknown | Resolution |
|---|---|
| Which slide component is "the contact Book slideModal" | `SlideMenu` — R5 |
| Does the phone LEFT JOIN actually work across INTEGER/TEXT | Yes, via affinity — R1 |
| Is a new query/pagination layer needed | No, `dbService` join support — R2 |
| How is "hard delete" done here | `dbService.remove` + 404 on 0 changes — R8 |
| Which `id` drives the delete | `unsubscribe_contacts.id`, aliased — R3 |

## Remaining open question (does not block Phase 1)

- **R6 authorization**: apply `authorize_operator` to the new endpoints, or match the unguarded
  convention of the surrounding routes? Planned as *match convention*; needs user confirmation.
