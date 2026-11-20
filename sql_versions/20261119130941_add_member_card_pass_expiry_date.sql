-- Adds member_card.pass_expiry_date: the card expiry that is printed on the wallet passes
-- last issued for the member. /member-pass compares it with card_expiry_date to notice an
-- expiry changed elsewhere (admin edit, sync) and then issues new passes.
-- Feature: member pass renewal fix (branch 018-wallet-card-generators).
-- NOT idempotent: a second run fails with "duplicate column name". Safe to run before or after
-- deploying the code (the route skips the column until it exists).
-- Existing passes are assumed to match the current expiry, so they are not re-issued.

ALTER TABLE member_card ADD COLUMN pass_expiry_date TEXT;

UPDATE member_card
SET pass_expiry_date = card_expiry_date
WHERE serial_number IS NOT NULL AND pass_expiry_date IS NULL;
