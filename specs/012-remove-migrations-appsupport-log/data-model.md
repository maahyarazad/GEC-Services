# Phase 1 Data Model: Migration Removal & App-Support Logging

No new tables are introduced. Two deltas: (A) `create_tables.sql` gains the DDL
the removed support IIFE used to apply; (B) `email_log` gains rows under a new
category (no schema change to `email_log` itself).

## A. Canonical schema delta (`create_tables.sql`)

Ported from the `routes/support.js` runtime migration (so fresh DBs match
existing ones after the IIFE is deleted):

### `support_tickets` — add column
| Column | Type | Default | Note |
|---|---|---|---|
| `has_unread_customer_reply` | INTEGER | `0` NOT NULL | was an `ALTER TABLE … ADD COLUMN` in the IIFE |

### `support_ticket_comments` — add column
| Column | Type | Default | Note |
|---|---|---|---|
| `source` | TEXT | `'admin'` NOT NULL | was an `ALTER TABLE … ADD COLUMN` in the IIFE |

### `support_email_threads` — new table
| Column | Type | Note |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | |
| `ticket_id` | INTEGER NOT NULL | FK → `support_tickets(id)` |
| `message_id` | TEXT NOT NULL | email Message-ID for threading |
| `created_at` | DATETIME DEFAULT `datetime('now')` | |

### `knowledge_base_view_log` — already present
No change (already declared in `create_tables.sql` with its indexes); verify the
two indexes `idx_kb_view_log_topic` / `idx_kb_view_log_created` exist, matching
the removed `routes/knowledge_base.js` IIFE.

**Rule**: columns are added inside the existing `CREATE TABLE` blocks (not as
`ALTER` statements), because `create_tables.sql` is applied only to fresh DBs;
existing DBs already carry these from the old IIFE ALTERs.

## B. `email_log` rows for app-support (no schema change)

The `email_log` table already exists. App-support sends add rows via
`logEmailSend`:

| Field | Value for app-support |
|---|---|
| `category` | `'app-support'` (stable key) |
| `recipient` | each normalized `to`/`bcc` address |
| `subject` | the email subject |
| `status` | `'sent'` or `'failed'` |
| `error` | short summary when failed, else null |
| `message_id` | nodemailer `response.messageId` (success) |
| `response` | nodemailer SMTP response string (success) |
| `created_at` | epoch ms |

## C. Category taxonomy delta (`services/emailLogCategories.js`)

`EMAIL_CATEGORIES` gains one entry:

| Key | Label |
|---|---|
| `app-support` | `App Support` |

`labelFor('app-support')` → `"App Support"`. The dashboard category summary and
drill-down use this automatically (no UI change).

## Relationships / state

- No state machine. `support_email_threads` relates many threads to one
  `support_tickets` row (existing relationship, just now declared in the
  canonical schema).
- App-support `email_log` rows are independent log records (no FK), consistent
  with every other logged category.
