# Quickstart: validating the partner sync fixes

The repo has no automated test runner, so validation is manual. Run everything on a development
database only, never on production. Contracts: [upload-csv](./contracts/upload-csv.md),
[member-card-sync](./contracts/member-card-sync.md). Rules:
[data-model.md](./data-model.md).

## Prerequisites

The DB path is hard-coded to `app.db` (`services/dbService.js:4`), so back up first and restore
afterwards:

```bash
cp app.db backups/app-before-016.db           # restore with: cp backups/app-before-016.db app.db
sqlite3 app.db < sql_files/migrate_partner_onboarding_sync_status.sql
npm start                                     # backend
cd public && npm run dev                      # frontend
```

- Run the migration a second time. It must fail only on the already-added columns, or be a no-op
  where it is guarded, and must not change data.
- Use a test partner contact that can log into the wizard (non-production skips the OTP check).
- Use an admin session for the dashboard.
- Point email at a sandbox or the email log.

## Scenario 1 — Invitations are sent (US1, SC-001)

1. Upload a list with 3 `add` rows (new phones), `Language = en`.
2. In Corporate Member, press **Sync** for the partner.
3. **Expect**: response `inserted: 3, invitations_queued: 3`.
4. Within about 1 min, `email_log` holds 3 invitation rows for those emails.
5. Put one row with an invalid email domain the transport rejects. **Expect**: one `error_log` row
   (`sendBatchEmails`), and the other invitations are still sent.

## Scenario 2 — Phone formats match (US2, SC-002)

1. Seed a card for the partner with `mobile_number = 971501234567`.
2. Upload an `update` row with `Normalized 🔒 = +971 50-123 4567` (new surname). Then sync.
3. **Expect**: the card's surname changes, `updated: 1`, and the staged row has
   `mobile_number = 971501234567` and `sync_status = 'synchronized'`.
4. Upload a `delete` row with `00971501234567`, then sync. **Expect**: `active = 0`, `deactivated: 1`.
5. Upload an `update` for an unknown phone, then sync. **Expect**: `not_found: 1`, and the row is
   `sync_status = 'not_found'`.

## Scenario 3 — Languages stay separate (US3, SC-009)

1. Upload 2 `en` adds and 2 `de` adds.
2. Corporate Member shows `EN 2 · DE 2`. Press **Sync**. **Expect**: `inserted: 2` (type 7, card
   numbers 7…), and both `de` rows are still `synchronized = 0`. They appear in Delivery Tracking's
   "Pending Only" view.
3. In Delivery Tracking, press **Sync (DE)**. **Expect**: `inserted: 2` (type 5, card numbers 5…).
   The button is then disabled.

## Scenario 4 — Card moves (US4, SC-004)

1. Seed an active card owned by Partner A, phone `971500000001`.
2. As Partner B, upload an `add` for that phone, then sync Partner B.
3. **Expect**:
   - `moved: 1` and `moves[0].from_partner = 'Partner A'`.
   - The card's `partner` is Partner B, with B's details, the same `card_number` and serial, and
     `active = 1`.
   - `remarks` starts with `moved from Partner A to Partner B`.
4. As Partner B, upload a `delete` for a phone owned by Partner C, then sync. **Expect**:
   `conflict: 1`, and Partner C's card is unchanged.
5. In the wizard, tamper with the `partner` form field (devtools) and submit. **Expect**: the
   staged rows carry the JWT partner, not the tampered value.

## Scenario 5 — Birthdays (US5, SC-005)

1. Prepare an xlsx with Date of Birth as an Excel date cell, as the text `25/09/1995`, as
   `1995-09-25`, and as `soon`.
2. **Expect**: the Review step shows 1 warning (the `soon` row), and all 4 rows are submitted.
3. Staged `birthday` values: `1995-09-25` ×3 and `NULL` ×1.
4. Sync the update of a card that already has a birthday, with an empty Date of Birth.
   **Expect**: the birthday is kept.

## Scenario 6 — Re-uploads (US6, SC-006)

1. Upload a 10-row list. **Expect**: `inserted: 10`.
2. Upload it again unchanged. **Expect**: `unchanged: 10`, and the pending count stays at 10.
3. Edit 1 row and upload. **Expect**: `replaced: 1, unchanged: 9`. The old row has
   `sync_status = 'superseded'`.

## Scenario 7 — No expiry, 30-day flag (US7, SC-007)

1. Set one pending row's `metadata_createdAt` to 40 days ago with
   `UPDATE … SET metadata_createdAt = datetime('now','-40 days')`.
2. **Expect**: the partner shows the pending row and a "> 30 days" chip whose tooltip shows the date.
3. Sync. **Expect**: the row is applied, and the chip disappears.

## Audit queries (SC-003)

```sql
-- every closed row has a final state; no pending row is closed
SELECT sync_status, synchronized, COUNT(*) FROM partner_onboarding_data GROUP BY 1,2;
-- at most one pending row per employee
SELECT LOWER(TRIM(partner)), mobile_number, COUNT(*) FROM partner_onboarding_data
WHERE synchronized = 0 GROUP BY 1,2 HAVING COUNT(*) > 1;           -- expect 0 rows
-- no '+' or punctuation in staged phones
SELECT COUNT(*) FROM partner_onboarding_data
WHERE synchronized = 0 AND mobile_number GLOB '*[^0-9]*';          -- expect 0
```

## Idempotency (FR-024)

Press Sync twice. **Expect**: the second response has every count at 0.
