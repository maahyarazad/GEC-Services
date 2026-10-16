# Quickstart & Validation: Event Template Dropdown (web_events)

Manual validation guide. See [contracts/web-events-api.md](./contracts/web-events-api.md)
for the endpoint and [data-model.md](./data-model.md) for the field mapping.

## Prerequisites

- App server running with valid MySQL env vars (`MYSQL_HOST`, `MYSQL_PORT`,
  `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`) pointing at the DB that
  contains `web_events`.
- Frontend built/served with `VITE_SERVERURL` pointing at that app server.
- A **full-tier admin** session (the Events section is not in the limited-tier
  allowlist from feature 008).
- At least one row in `web_events`.

## Step 0 — Confirm the physical `web_events` columns (one-time)

Before trusting the SELECT aliases, verify the real column names:

```sql
SHOW COLUMNS FROM web_events;
-- or: DESCRIBE web_events;
```

Map the physical names to `id`, `title`, `description`, and the date column in
the route's SELECT (see research.md R3). If they already match, no change.

## Step 1 — Endpoint returns templates

```bash
# With an authenticated admin cookie jar (cookies.txt):
curl -s --cookie cookies.txt "$VITE_SERVERURL/api/web-events" | jq .
```

**Expected**: `{ "status": true, "data": [ { "id", "title", "description", "eventDate" }, ... ] }`
with one entry per `web_events` row.

## Step 2 — Endpoint is admin-guarded

```bash
curl -s -o /dev/null -w "%{http_code}\n" "$VITE_SERVERURL/api/web-events"   # no cookie
```

**Expected**: `401` (or `403` for a limited-tier session). Not `200`.

## Step 3 — Dropdown lists titles (US1)

1. Log in to the admin dashboard as a full admin; open the **Events** section.
2. Click **New Event** to open the Create New Event modal.
3. Open the new template dropdown.

**Expected**: the dropdown lists every `web_events` row **by title only**, and is
type-ahead searchable.

## Step 4 — Selecting a template pre-fills the fields (US1, core)

1. In the open dropdown, select a title.

**Expected**: Title, Description, and Event Date & Time fill with the selected
row's values; the date appears correctly in the `datetime-local` picker.

## Step 5 — Fields remain editable, save works (US1)

1. After selecting a template, edit the Title (and/or other fields).
2. Click **Save**.

**Expected**: the event is created via `POST /api/events` with the edited
values; a success snackbar shows and the grid refreshes with the new row.

## Step 6 — Edit mode re-seed (US2)

1. Click Edit on an existing event.
2. Select a template from the dropdown.

**Expected**: Title/Description/Date are overwritten with the template's values;
saving updates the existing event (its `id` is preserved) via `PUT /api/events`.

## Step 7 — Graceful degradation (edge cases / SC-004)

- **MySQL down**: stop/misconfigure MySQL, reopen the modal. **Expected**: modal
  still opens; dropdown shows an empty/error (non-blocking) state; a manual
  event can still be created and saved.
- **Empty table**: with `web_events` empty, the dropdown shows a "no templates"
  state; manual entry works.
- **Null description/date**: a web event with null description/date seeds an
  empty field (not the literal "null"); required-field validation still applies.

## Pass criteria

- [ ] Steps 1–6 behave as described.
- [ ] Step 2 returns 401/403 without an admin session.
- [ ] Step 7 confirms manual creation never blocked by template-load failure.
