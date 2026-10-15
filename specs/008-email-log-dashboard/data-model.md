# Phase 1 Data Model: Do-Not-Reply Email Log

One new entity. Storage: existing SQLite `app.db` via `services/dbService.js`. Created by an
idempotent startup migration (mirrored in `create_tables.sql`), following the
`knowledge_base_view_log` precedent.

## Entity: Email Log Entry → table `email_log`

One row per recipient per do-not-reply send attempt. A send to multiple recipients produces one row
per recipient (so recipient search and per-recipient drill-down are exact — see FR-006 §US2.3).

| Column       | Type    | Notes |
|--------------|---------|-------|
| `id`         | INTEGER PRIMARY KEY AUTOINCREMENT | surrogate key |
| `category`   | TEXT NOT NULL | stable category key (see Category keys). Defaults to `uncategorised` at the service layer if a caller passes none |
| `recipient`  | TEXT NOT NULL | a single destination email address (lower-cased for consistent search) |
| `subject`    | TEXT | optional; the send subject, for admin context. Never body/attachments (FR-012) |
| `status`     | TEXT NOT NULL CHECK (`status` IN ('sent','failed')) | outcome of the send attempt |
| `error`      | TEXT | short error summary when `status='failed'`; NULL otherwise |
| `created_at` | INTEGER NOT NULL | epoch **milliseconds**, matching the project's `${Date.now()}` convention |

### DDL (idempotent — runs at router load; mirror in `create_tables.sql`)

```sql
CREATE TABLE IF NOT EXISTS email_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category    TEXT    NOT NULL,
  recipient   TEXT    NOT NULL,
  subject     TEXT,
  status      TEXT    NOT NULL CHECK (status IN ('sent','failed')),
  error       TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_log_category   ON email_log (category);
CREATE INDEX IF NOT EXISTS idx_email_log_created     ON email_log (created_at);
CREATE INDEX IF NOT EXISTS idx_email_log_recipient   ON email_log (recipient);
```

### Indexes — rationale

- `idx_email_log_category` — the categories summary (`GROUP BY category`) and category drill-down
  filter.
- `idx_email_log_created` — newest-first ordering and paging (`ORDER BY created_at DESC`).
- `idx_email_log_recipient` — recipient search (FR-008). Prefix/`LIKE '%…%'` search won't use the
  index fully, but it keeps exact/equality lookups fast and the table small enough that `LIKE`
  scans remain acceptable at expected scale.

## Validation rules

- `category` is written by the service, never trusted from an HTTP client. If a high-level caller
  omits it, the service substitutes `uncategorised` (never NULL).
- `recipient` is required and stored lower-cased; a send with an empty recipient is not logged.
- `status` is constrained to `sent` | `failed` by the CHECK.
- `created_at` is set by the service with `Date.now()` at log time.
- Writes are **best-effort** (FR-003): any insert error is caught and `console.error`'d; it never
  propagates to the email-send result.

## Category keys (not a table — derived + fixed catch-all)

Categories are not stored as their own table. The distinct `category` values present in `email_log`
(plus the fixed `uncategorised`) form the category list; labels are a static key→label map used by
the API/client. See `research.md` R5 for the full key/label/source-function mapping. Keys:

`event-registration`, `confirmation-message`, `membership-pass`, `membership-card`,
`membership-invitation`, `otp`, `request-received`, `company-data-confirmation`, `password-reset`,
`party-invitation`, `venue-courtesy`, `newsletter-batch`, `uncategorised`.

## Derived views (computed in queries, not stored)

- **Category summary**: `SELECT category, COUNT(*) AS count, MAX(created_at) AS last_sent FROM
  email_log GROUP BY category` → feeds US1's category list (label looked up from the key map;
  categories with zero rows simply don't appear, consistent with FR-005 / edge case).
- **Entry page**: `SELECT … FROM email_log [WHERE category = ?] [AND recipient LIKE ?] ORDER BY
  created_at DESC LIMIT ? OFFSET ?` → feeds US2 drill-down and US3 search.

## Lifecycle & retention

- Append-only. No updates or deletes in normal operation.
- Retention is indefinite in v1 (Assumptions). A future pruning job (e.g. delete rows older than N
  months) can act on `created_at`; out of scope here but the schema supports it.
