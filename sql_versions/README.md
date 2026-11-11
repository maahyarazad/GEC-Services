# sql_versions

Database changes for `app.db` (SQLite). The app runs no migrations itself; apply them by hand.

## Files

| File | What it is |
|---|---|
| `schema.sql` | The **current full schema**, kept up to date with every change. Use it for a new, empty database. It is updated in place, so it has no timestamp. |
| `YYYYMMDDHHMMSS_<verb>_<object>.sql` | A **migration**: one change for an existing database, applied once, in name order. |

## Naming rules

- **Prefix**: 14-digit timestamp `YYYYMMDDHHMMSS`, taken from the commit that introduced the change
  (`git log --follow --format=%ad --date=format:%Y%m%d%H%M%S -- <file>`). For a change not committed
  yet, use the time it was written. Sorting by name then gives the order to apply them.
- **Description**: lower-case `snake_case`, starting with a verb: `create_`, `add_`, `drop_`, `alter_`,
  `backfill_`, `rename_`. Name the table or feature, e.g. `add_partner_onboarding_sync_status`.
- **One change per file.** Don't mix unrelated tables in one migration.
- **Never edit a migration after it has run anywhere**; add a new one instead. Then also update `schema.sql`.
- Start each file with a comment: what it does, which feature or commit it belongs to, whether it is
  safe to run twice, and anything it depends on.

## Migrations

| File | Commit | Notes |
|---|---|---|
| `20260629134532_create_clubtime_guests.sql` | 098cf2829 (Feature 24, Past Events Log) | **Starts with `DROP TABLE IF EXISTS`.** Only for a database without `clubtime_guests`. |
| `20261020131218_backfill_app_support_email_log.sql` | 7124954c2 (#75) | Idempotent. |
| `20261027115245_add_partner_onboarding_sync_status.sql` | aa0869774 (#78, feature 016) | Run before deploying 016; second run reports "duplicate column name". |
| `20261106165300_add_twilio_generated_columns.sql` | feature 017 (branch `017-whatsapp-history-pagination`) | Not idempotent. Run before deploying 017, or the server won't start. |
| `20261106165400_add_twilio_message_history_indexes.sql` | feature 017 (branch `017-whatsapp-history-pagination`) | Needs the generated columns above. |

Apply one: `sqlite3 app.db < sql_versions/<file>.sql`
