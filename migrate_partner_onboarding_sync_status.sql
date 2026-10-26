-- Partner onboarding sync status (feature 016).
--
-- Brings an existing app.db in line with create_tables.sql:
--   * adds sync_status / synced_at / sync_note, so every staged row records HOW it was
--     closed (synchronized, superseded, not_found, conflict, already_active) instead of
--     only a 0/1 flag;
--   * stores pending phones in the member_card format (digits only, no "+"), so update
--     and delete rows match their cards;
--   * closes older pending duplicates and adds a partial unique index, so each employee
--     has at most one pending row per partner.
--
-- Rows closed before this script ran are marked 'synchronized' with a note; they are not
-- re-opened. Run once, BEFORE deploying the 016 code:
--   sqlite3 app.db < migrate_partner_onboarding_sync_status.sql
-- A second run reports "duplicate column name" for the three ALTER TABLE statements; the
-- remaining statements are guarded so they change nothing.

ALTER TABLE partner_onboarding_data ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending', 'synchronized', 'superseded', 'not_found', 'conflict', 'already_active'));
ALTER TABLE partner_onboarding_data ADD COLUMN synced_at DATETIME;
ALTER TABLE partner_onboarding_data ADD COLUMN sync_note TEXT;

BEGIN;

UPDATE partner_onboarding_data
SET sync_status = 'synchronized',
    sync_note   = 'closed before 016',
    synced_at   = COALESCE(synced_at, metadata_createdAt)
WHERE synchronized = 1 AND sync_status = 'pending';

UPDATE partner_onboarding_data
SET mobile_number = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(mobile_number),
        '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', '')
WHERE synchronized = 0;

UPDATE partner_onboarding_data
SET mobile_number = substr(mobile_number, 3)
WHERE synchronized = 0 AND mobile_number LIKE '00%';

UPDATE partner_onboarding_data
SET synchronized = 1,
    sync_status  = 'superseded',
    sync_note    = 'duplicate closed by 016 migration',
    synced_at    = datetime('now')
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY LOWER(TRIM(partner)), mobile_number
                   ORDER BY metadata_createdAt DESC, id DESC
               ) AS rn
        FROM partner_onboarding_data
        WHERE synchronized = 0
    )
    WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_pod_pending_partner_phone
    ON partner_onboarding_data (LOWER(TRIM(partner)), mobile_number)
    WHERE synchronized = 0;

COMMIT;
