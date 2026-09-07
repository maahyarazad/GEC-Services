# Quickstart: Validating the Unsubscribed Contacts Panel

**Feature**: `006-unsubscribe-contacts-list` | **Date**: 2026-09-07

How to run and verify this feature end to end. Contract details live in
`contracts/unsubscribe-api.md`; row shape in `data-model.md`. No implementation code here.

---

## Prerequisites

- Node.js — note the environment split: the repo's local Node is v22, the deploy target runs
  v20.20.2. Verify against the version you actually deploy on.
- `app.db` present at the repo root (better-sqlite3, `services/dbService.js:4`).
- Server env configured (`.env` — the app calls `require("dotenv").config()` at startup).
- `ENVIRONMENT` **not** set to `PRODUCTION` while testing deletes, so no real WhatsApp traffic is
  triggered by adjacent code paths.

## Setup

```bash
# Backend (repo root)
npm install
node server.js

# Frontend
cd public
npm install
npm run dev
```

The frontend reads `VITE_SERVERURL` for API calls (`WhatsApp.jsx` fetches use it), and all
requests are sent with `credentials: 'include'`.

---

## Seed test data

The table is nearly empty in development (verified: **1** row). The unmatched case — the whole
reason for a LEFT JOIN — will not appear unless you seed it. Insert one of each:

```bash
node -e "
const db = require('better-sqlite3')('./app.db');
const ins = db.prepare('INSERT OR IGNORE INTO unsubscribe_contacts (phone) VALUES (?)');
// matched: reuse a phone that exists in contact_book
const known = db.prepare('SELECT phone FROM contact_book LIMIT 1').get().phone;
ins.run(known);
// unmatched: a phone deliberately absent from contact_book
ins.run('+491700000000');
console.log(db.prepare('SELECT id, phone FROM unsubscribe_contacts').all());
"
```

Note the writer passes a `+`-prefixed **string** and SQLite stores it as an INTEGER without the `+`
— that is the production behaviour (`research.md` R1), so seed it the same way rather than
inserting a clean integer.

---

## Scenario 1 — Panel opens and lists unsubscribes (spec US1)

1. Open the dashboard and navigate to the WhatsApp Broadcast section.
2. In the **Manage Data** button group, click **Unsubscribed**.

**Expected**:
- A slide panel titled "Unsubscribed Contacts" opens.
- The browser URL gains `?view=unsubscribed` (`handleSetOpenPanel` syncs panel state to the query
  string, like every sibling panel).
- The grid lists both seeded rows.

## Scenario 2 — Matched contact is enriched (spec US1 #2)

**Expected**: the row seeded from a known `contact_book` phone shows first name, last name, type
and language.

Cross-check the API directly:

```bash
curl -s "http://localhost:<PORT>/api/unsubscribe-contacts?page=1&pageSize=25" | head -c 800
```

Confirm `contact_id` is non-null and the name fields are populated. `phone` must be a JSON
**number** (no `+`, unquoted).

## Scenario 3 — Unmatched unsubscribe still appears (spec US1 #3, the LEFT JOIN check)

**Expected**: the `+491700000000` row is present, with `contact_id: null` and every `cb.*` field
null, rendered with the "No matching contact" indicator and no console error.

**This is the scenario that fails if the join is ever changed to an INNER JOIN** — the row silently
vanishes and the count drops by one. Verify both the grid and the raw response.

## Scenario 4 — Server-side paging, sorting, filtering (spec US1 #4)

1. Change page size; sort by "Unsubscribed At"; add a `contains` filter on Phone.

**Expected**: each interaction issues a request with `page` / `pageSize` / `sortField` /
`sortOrder` / `filterField` / `filterOperator` / `filterValue`, and `total` in the response stays
consistent with the number of rows the pager reports.

## Scenario 5 — Hard delete with confirmation (spec US2)

1. Click the red trash icon on the unmatched row.
2. **Expected**: a confirmation dialog appears warning the removal is permanent.
3. Click **Cancel** → **Expected**: nothing is deleted; the row is still listed.
4. Click the icon again and confirm.
5. **Expected**: success snackbar, the grid refreshes without the row, `total` decreases by one.

Verify the delete was real and correctly scoped:

```bash
node -e "
const db = require('better-sqlite3')('./app.db', { readonly: true });
console.log('unsubscribe rows:', db.prepare('SELECT id, phone FROM unsubscribe_contacts').all());
console.log('contact_book count:', db.prepare('SELECT COUNT(*) c FROM contact_book').get().c);
"
```

**Expected**: the row is gone from `unsubscribe_contacts`, and `contact_book` count is unchanged
(FR-008 — the join must not have deleted the person).

## Scenario 6 — Deleting the wrong id is impossible (FR-009 regression guard)

Delete the **matched** row — the one whose `contact_id` differs from its `id`. Confirm afterwards
that the `contact_book` row with that `contact_id` still exists:

```bash
node -e "
const db = require('better-sqlite3')('./app.db', { readonly: true });
console.log(db.prepare('SELECT id, first_name FROM contact_book WHERE id = ?').get(<contact_id>));
"
```

**Expected**: the contact is still there. If it is missing, the `uc.id AS id` / `cb.id AS contact_id`
aliasing has regressed (`research.md` R3) — the single most dangerous failure mode in this feature.

## Scenario 7 — Delete of an already-deleted row returns 404

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X DELETE \
  -H 'Content-Type: application/json' -d '{"id":999999}' \
  "http://localhost:<PORT>/api/unsubscribe-contacts"
```

**Expected**: `404`, body `{"status":false,"message":"Unsubscribe record not found"}` — not a 500.

## Scenario 8 — Removed phone re-enters the broadcast audience (spec US2 #4, SC-004)

The point of the delete. With the matched contact's phone removed from `unsubscribe_contacts`,
confirm the broadcast audience query no longer excludes it:

```bash
node -e "
const db = require('better-sqlite3')('./app.db', { readonly: true });
const total = db.prepare('SELECT COUNT(*) c FROM contact_book').get().c;
const eligible = db.prepare('SELECT COUNT(*) c FROM contact_book cb WHERE cb.phone NOT IN (SELECT uc.phone FROM unsubscribe_contacts uc)').get().c;
console.log({ total, eligible, excluded: total - eligible });
"
```

**Expected**: `excluded` drops by one for each deleted row that had a matching contact. This
exercises the same `NOT IN` filter used at `services/whatsAppSender.js:150` and `:174`.

## Scenario 9 — Empty state

Delete all seeded rows.

**Expected**: the grid renders an empty state, `total: 0`, no error, and the panel still opens.

---

## Regression checks

Confirm this feature did not disturb what it borrows from:

- The **Contact Book** panel still opens, pages, filters and deletes as before (shared
  `openPanel` state, shared `CustomDataGrid`, shared `AlertProvider`).
- `DELETE /api/contacts` still behaves as before (a sibling route in the same file).
- Other `SlideMenu` panels — Guest List, Event List, Event Logs, Delivery/Response Logs — still
  open, and opening the new panel closes the previous one (single `openPanel` state).
- `?view=` deep-linking still works for the pre-existing panels.

## Known limitation to observe, not fix here

`unsubscribe_contacts.phone` is INTEGER and the join to `contact_book.phone` (TEXT) works only via
SQLite type affinity. Verified sound against current data (2461 contacts, 1 malformed phone
containing a U+202C character that will not coerce). If that malformed contact ever unsubscribes,
it will show as unmatched in this panel. Schema normalisation is deliberately out of scope —
see `research.md` R1.
