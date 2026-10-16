# Phase 0 Research: Event Template Dropdown (web_events)

## R1 — Where to add the backend endpoint

**Decision**: Add `GET /api/web-events` to the existing `routes/events.js`.

**Rationale**: `routes/events.js` is already registered in `routes.js` (`app.use("/", events)`) and already owns the `/api/events*` paths. Its routes sit under the `/api/` prefix, which the feature-008 chokepoint in `server.js` guards (`authorize_admin` + full-tier `authorize_admin_full`, with only `/api/maps/*` exempted). A new `/api/web-events` route therefore inherits admin-only access with zero extra wiring.

**Alternatives considered**:
- A brand-new `routes/web_events.js` router — rejected: unnecessary file + registration for a single read endpoint closely related to events.
- Mounting under `gec_members` (the only `/api/`-prefixed router) — rejected: that router is a narrow members-check module; events.js is the natural home.

## R2 — How to query MySQL

**Decision**: Use the existing `const { getPool } = require("../services/mysqlService")`, then `const [rows] = await pool.query("SELECT ... FROM web_events")`, returning `{ status: true, data: rows }`.

**Rationale**: This is the established pattern in `routes/gec_members.js` and `routes/member_card.js` (`getPool()` → `pool.query(...)` → JSON). `mysql2/promise` returns `[rows, fields]`, so destructuring `[rows]` is correct. The pool is a singleton, so no connection management is needed in the route.

**Alternatives considered**: Opening a dedicated connection per request — rejected: the shared pool already handles this (`connectionLimit: 10`).

## R3 — `web_events` column mapping (the one real unknown)

**Decision**: Select an explicit, aliased column set rather than `SELECT *`, mapping to the three form fields plus a stable id. **Confirmed against the live schema (2026-10-15)** — `web_events` has no `event_date` column; the event's date/time is `eventTime` (the `time` column is the record-created timestamp, not the event date):

```sql
SELECT id, title, description, eventTime AS eventDate
FROM web_events
ORDER BY eventTime DESC
```

The API normalises to a stable response shape `{ id, title, description, eventDate }` regardless of the physical column names, so the frontend never depends on raw column names. (Other candidate columns present but unused: `shortDescription`, `topic`, `place`, `status`, pricing/flags.)

**Rationale**: The user described the needed fields as "title", "description", and "the date". The exact physical column names in `web_events` are not verifiable from the repo (the table lives in the external MySQL DB; no migration or model for it exists in-repo). Selecting explicit columns (not `*`) keeps the browser payload small and the mapping obvious. **Action for implementation**: confirm the real column names against the live schema (`DESCRIBE web_events;` or `SHOW COLUMNS FROM web_events;`) and adjust the SELECT aliases if they differ (e.g. `name AS title`, `date`/`start_date` → `event_date`). This is a one-line change isolated to the route.

**Alternatives considered**:
- `SELECT *` as the user literally wrote — rejected for the browser payload (returns every column, possibly large/sensitive), but it is the right first step *at the mysql client* to discover the real column names before finalising the aliased SELECT.
- Hardcoding column names in the frontend — rejected: couples the UI to the external schema; normalising in the route isolates the mapping to one place.

## R4 — Which MUI control for the dropdown

**Decision**: Use MUI `Autocomplete` (single-select) with `options` = the fetched templates, `getOptionLabel = (o) => o.title`, keyed by `o.id`.

**Rationale**: "Only view the titles" + "the entire table" implies a potentially long list where type-ahead matters. `Autocomplete` gives search-as-you-type over titles, handles large lists better than a plain `Select`, and tolerates duplicate titles because selection carries the whole option object (keyed by id), not just the label string. It fits the existing MUI-based modal.

**Alternatives considered**:
- `Select` + `MenuItem` — simpler, but no search; awkward for a full table and ambiguous with duplicate titles.

## R5 — Date normalisation for the `datetime-local` field

**Decision**: Convert the web event's date to the `YYYY-MM-DDTHH:mm` format the modal's date input expects, reusing the same approach already in `openEdit`:
`new Date(value).toISOString().slice(0, 16)`. An invalid/absent date yields an empty string.

**Rationale**: The modal's `event_date` field is a `datetime-local` input; `openEdit` already normalises stored dates this way. Matching it keeps behaviour consistent and avoids a new date library.

**Alternatives considered**: `dayjs` formatting — unnecessary; the ISO slice already used in the file is sufficient and dependency-free here.

## R6 — Failure / empty handling

**Decision**: Fetch templates when the modal opens (or on mount). On error or empty result, set an empty options list and surface a non-blocking state (disabled/empty dropdown with a hint); never block the Title/Description/Date fields or the Save button.

**Rationale**: FR-007/SC-004 require manual creation to keep working when MySQL is down. The existing modal already works without the dropdown, so the dropdown is strictly additive.

**Alternatives considered**: Blocking the modal until templates load — rejected: a MySQL outage would make manual event creation impossible, a regression.

## Resolved unknowns

| Unknown | Resolution |
|---|---|
| Endpoint location | `GET /api/web-events` in `routes/events.js` (R1) |
| Query mechanism | existing `getPool().query()` (R2) |
| `web_events` columns | CONFIRMED: `id,title,description,eventTime`; SELECT aliases `eventTime AS eventDate` → normalised `{id,title,description,eventDate}` (R3) |
| Dropdown control | MUI `Autocomplete`, title label, id key (R4) |
| Date format | ISO-slice to `datetime-local` (R5) |
| Failure mode | non-blocking empty/error state (R6) |

All NEEDS CLARIFICATION items from the spec are resolved to an actionable default; the only item requiring a live check is the physical column names (R3), with a documented one-line adjustment point.
