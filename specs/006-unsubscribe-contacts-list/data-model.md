# Phase 1 Data Model: Unsubscribed Contacts Panel

**Feature**: `006-unsubscribe-contacts-list` | **Date**: 2026-09-07

No schema changes are introduced by this feature. Both tables already exist; this document
describes how they are read, joined and projected.

---

## Existing entities

### `unsubscribe_contacts` (owned by this feature — read + hard delete)

Defined at `create_tables.sql:457-461`.

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | INTEGER | PK AUTOINCREMENT | **Row identity for the grid and the delete key** (FR-009) |
| `phone` | INTEGER | NOT NULL, UNIQUE | Stored *without* the leading `+` — see `research.md` R1 |
| `created_at` | DATETIME | DEFAULT `datetime('now')` | When the opt-out was recorded; UTC |

**Written by**: `services/whatsAppSender.js:867-868`, when an inbound WhatsApp reply carries
`ButtonPayload === "UNSUBSCRIBE"`.

**Read by**: the broadcast audience filters at `services/whatsAppSender.js:150` and `:174`
(`AND cb.phone NOT IN (SELECT uc.phone FROM unsubscribe_contacts as uc)`).

**Foreign keys**: none, in either direction. Deleting a row has no cascade effect.

### `contact_book` (joined — read only, never mutated by this feature)

Defined at `create_tables.sql:51-63`. Fields consumed by this feature:

| Field | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Projected as `contact_id` to avoid colliding with `uc.id` |
| `title` | VARCHAR(10) | |
| `first_name` | VARCHAR(255) NOT NULL | |
| `last_name` | VARCHAR(255) | |
| `gender` | VARCHAR(8) | |
| `phone` | VARCHAR(50) NOT NULL | Join key; TEXT affinity, stored `+`-prefixed. **Not** UNIQUE |
| `language` | VARCHAR(2) NOT NULL | |
| `type` | VARCHAR(20) NOT NULL | CHECK-constrained enum (`club_member`, `club_partner`, `expert`, `gec_staff`, `difa`, `expert_guest`, `only_guest`, `medical_society`, `Wüstenkinder`) |
| `club_partner_name` | VARCHAR(255) | |
| `blacklist` | BOOLEAN DEFAULT FALSE | Distinct concept from unsubscribe — see below |

---

## Relationship

```text
unsubscribe_contacts (1) ──LEFT JOIN── (0..1) contact_book
                     ON cb.phone = uc.phone
```

- **LEFT, not INNER**: an unsubscribed phone that never existed in the contact book must still be
  listed (FR-002, spec Edge Cases).
- **Cardinality is 0..1 in practice, not by constraint**: `contact_book.phone` is not UNIQUE.
  Current data has 0 duplicate phones across 2461 rows (`research.md` R4). If a duplicate is ever
  introduced, one unsubscribe row would render as multiple grid rows — which is why the total
  count is computed over the *same* join rather than over `unsubscribe_contacts` alone.
- **The join is type-affinity dependent** (INTEGER ↔ TEXT). Verified working; see `research.md` R1
  for why the plain comparison is used deliberately rather than a normalising cast.

### `blacklist` vs. unsubscribe — not the same thing

`contact_book.blacklist` is an operator-set suppression flag on the contact record.
`unsubscribe_contacts` is a recipient-initiated opt-out keyed by phone. The broadcast query applies
**both** independently (`AND cb.blacklist = 0` *and* `AND cb.phone NOT IN (...)`). Removing an
unsubscribe row does **not** clear a blacklist flag, and a row may legitimately show
`blacklist = 1` in this grid. The column is projected so operators can see that a delete here will
not, on its own, make the contact reachable.

---

## Projected read model: `UnsubscribeRow`

The shape returned by the list endpoint and consumed by the grid.

| Field | Source | Type in JSON | Purpose |
|---|---|---|---|
| `id` | `uc.id` | number | Grid row key; delete target |
| `phone` | `uc.phone` | **number** | Display (format as `+${phone}`) and filtering |
| `created_at` | `uc.created_at` | string | "Unsubscribed at" column |
| `contact_id` | `cb.id` | number \| null | Presence indicates a matched contact |
| `title` | `cb.title` | string \| null | |
| `first_name` | `cb.first_name` | string \| null | |
| `last_name` | `cb.last_name` | string \| null | |
| `gender` | `cb.gender` | string \| null | |
| `language` | `cb.language` | string \| null | |
| `type` | `cb.type` | string \| null | |
| `club_partner_name` | `cb.club_partner_name` | string \| null | |
| `blacklist` | `cb.blacklist` | 0 \| 1 \| null | See note above |

**Every `cb.*` field is nullable** regardless of its `NOT NULL` declaration on the base table —
the LEFT JOIN produces NULLs for unmatched rows. `first_name` is `NOT NULL` in `contact_book` but
arrives as `null` here whenever `contact_id` is `null`. The UI must not assume a name exists.

`phone` is a JSON **number**, not a string: `971585831595`, not `"+971585831595"`. Magnitude is
well within `Number.MAX_SAFE_INTEGER`, so no precision handling is needed — only display
formatting.

### Derived display field

- **Name**: `[title, first_name, last_name]` joined on spaces, trimmed; falls back to a visible
  "No matching contact" indicator when `contact_id` is `null`. Derived in the column config, not
  stored or returned by the API.

---

## Validation rules

| Rule | Where enforced |
|---|---|
| `id` must be a positive integer | Request validation on the delete endpoint |
| Delete targets `unsubscribe_contacts.id` only | Explicit `uc.id AS id` aliasing (`research.md` R3) |
| Missing row → 404, not a silent success | `dbService.remove` returns `changes === 0` |
| `contact_book` rows are never written | Feature issues no INSERT/UPDATE/DELETE against `contact_book` |

## State transitions

`unsubscribe_contacts` has no status column; a row's existence *is* the state.

```text
  (recipient taps UNSUBSCRIBE in WhatsApp)
                 │
                 ▼
        row EXISTS ──────────► phone excluded from all broadcasts
                 │
                 │ operator confirms delete in this panel  (hard delete, irreversible)
                 ▼
        row ABSENT ──────────► phone eligible for broadcasts again
                               (subject to cb.blacklist and the other audience filters)
```

There is no soft-delete, archive, or audit row (spec FR-007, Out of Scope). Once deleted, the
`created_at` evidence of when the person opted out is gone — the only trace of the prior opt-out
would be the original inbound message in the response logs.
