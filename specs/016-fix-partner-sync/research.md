# Research: Partner employee list sync — reliability fixes

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-26

## Evidence gathered

| # | Finding | Source |
|---|---|---|
| E1 | `sendBatchEmails(set)` calls `chunkArray(set, 25)`, which loops on `array.length`. A `Set` has no `.length`, so 0 batches are built and no email is sent. | `routes/member_card.js` (sync), `helpers/essentials.js:2`, `services/emailService.js:1892` |
| E2 | `membership__invitation` **rethrows** on failure (`emailService.js` ~L973). `sendBatchEmails` uses `Promise.all` inside a single outer `try`, so one failed email aborts every later batch. | `services/emailService.js` |
| E3 | A **German sync already exists**: "Sync (DE)" in Delivery Tracking posts `language: 'de'` (commit `6651cfd6b`). The doc's §7.2 claim that "the UI always syncs with `en`" was wrong. The real bug is that Step 4 closes all of the partner's pending rows, so whichever sync runs first closes the other language's rows. | `DeliveryTrackingSection.jsx:256`, `member_card.js` Step 4 |
| E4 | Live cards store phones as digits only (4,317 start with `9`, none with `+`). 179 of 194 staged rows start with `+`. | local `app.db` |
| E5 | `/upload-csv` stores `r["mobile number"]` (raw). The validated value is in `r["normalized 🔒"]`. | `routes/partner_onboarding.js` |
| E6 | All staged birthdays are empty. The validator reads `typeof cell === 'object' ? cell.result : …`. ExcelJS returns date cells as JS `Date`, which is an object with no `.result`, so `undefined` reaches the CSV. The server also builds a `birthday` value but inserts the raw `r["date of birth"]`. | `validateAndConvertXlsx.tsx`, `partner_onboarding.js` |
| E7 | `partner_onboarding_data` has no unique key, so `INSERT OR IGNORE` never ignores. `create_tables.sql` also has a syntax error: a stray `;` after the `action_type` CHECK. | `create_tables.sql:298` |
| E8 | `/upload-csv` takes `partner` from the **request body**. `authorize_partner` only checks that the JWT is valid; it does not compare the partner. Once adds can move cards (FR-013), a logged-in partner could post another partner's name. | `middleware/auth.js:100`, `partner_onboarding.js` |
| E9 | PM2 runs one fork-mode instance, and `better-sqlite3` transactions are synchronous. Two sync requests are therefore serialized in-process. | `server-pm2.json` |
| E10 | SQLite 3.53 supports partial and expression indexes and `ALTER TABLE ADD COLUMN … DEFAULT … CHECK`. | `sqlite_version()` |
| E11 | Schema changes go into `create_tables.sql`. Existing databases get a one-off root-level `.sql` script (no runtime migrations, per #74). | `specs/012-…`, `backfill_app_support_email_log.sql` |
| E12 | No automated test runner exists (`npm test` is a stub). Earlier features validate with `quickstart.md` plus `node -e` checks. | `package.json`, `specs/015-…` |

## Decisions

### D1 — Invitations: pass an array of the created cards; isolate each failure (FR-001–FR-004)

- **Decision**: The sync collects the `member_card` rows it **inserted**, re-read by id so the
  email gets the same shape that Resend Invitation uses. After commit it calls `sendBatchEmails`
  with that array **without awaiting it**. `sendBatchEmails` accepts any iterable (`Array.from`)
  and uses `Promise.allSettled`. Each rejection is written to `error_log` with the member's email,
  and batching continues. The response returns `invitations_queued`.
- **Rationale**: Fixes E1 and E2 at the source, so both callers benefit. Re-reading the card gives
  the email the stored partner and digits-only phone, not the staged values.
- **Alternatives**: Convert only at the call site (`[...set]`) — rejected, because it leaves E2
  and the trap for the next caller. Awaiting the batch before responding — rejected, because 500
  members at 25 per 10 s takes about 3.5 min and would exceed client timeouts, which is why Resend
  already responds first.

### D2 — One phone normalizer used everywhere (FR-005–FR-009)

- **Decision**: Add `normalizePhone(raw)` to `helpers/essentials.js`. It trims, keeps digits only,
  and drops a leading international `00`. It returns `""` when no digits remain. It runs (a) at
  upload, on `normalized 🔒`, falling back to `mobile number` when that column is absent, and (b)
  at sync, on every row, as a guard for rows staged before release.
- **Rationale**: Gives one matching rule for add, update and delete (E4). The card format stays as
  it is, so the 4,664 cards need no migration.
- **Alternatives**: Store `+E.164` and change cards — rejected, because it touches every card plus
  the `/members/mobile-check` contract, which already strips non-digits.

### D3 — Birthdays: format on the client, parse strictly on the server (FR-016–FR-018)

- **Decision**:
  - **Client**: a `Date` cell, or a formula result that is a `Date`, becomes `YYYY-MM-DD` built
    from UTC parts. ExcelJS dates are UTC midnight, so local parts can shift the day.
  - **Server**: `parseBirthday` accepts `D/M/YYYY`, `DD/MM/YYYY` and `YYYY-MM-DD[...]`. It rejects
    impossible dates (31/02) and returns `YYYY-MM-DD` or `null`. The parsed value is what gets
    stored.
  - **Wizard warnings**: the validator returns a `warnings[]` list (row number plus reason) for
    unreadable dates and keeps those rows. The review step lists them.
  - **Sync**: updates use `birthday = COALESCE(?, birthday)`, so an empty value never wipes a card.
- **Rationale**: Fixes both halves of E6. An unreadable birthday is a warning, not a rejection,
  which matches the spec.
- **Alternatives**: Reject rows with bad dates — rejected by FR-017.

### D4 — Row lifecycle: add `sync_status`, keep `synchronized` as the "closed" flag (FR-011, FR-021)

- **Decision**: Add these columns to `partner_onboarding_data`:
  - `sync_status TEXT NOT NULL DEFAULT 'pending'`, with a CHECK on `pending`, `synchronized`,
    `superseded`, `not_found`, `conflict`, `already_active`
  - `synced_at DATETIME`
  - `sync_note TEXT`

  `synchronized` keeps meaning **closed** (0 = pending, 1 = closed in any final state). Every
  existing `synchronized != 1` query (`/api/partner-onboarding`,
  `/api/partner-delivery-employees`, stats) keeps working unchanged. Only
  `sync_status = 'synchronized'` means applied.
- **Rationale**: Makes FR-021 auditable (SC-003) without touching every reader. The sync closes
  rows **by id**, one at a time with their own outcome, which removes the broad Step 4 `UPDATE`
  that caused issue 2.
- **Alternatives**: Overload `synchronized` with 2, 3, … — rejected, because `!= 1` readers would
  treat closed rows as pending.

### D5 — Upload: at most one pending row per employee; honest counts (FR-019, FR-020)

- **Decision**: Inside the upload transaction, for each row look up the pending row with the same
  `LOWER(TRIM(partner))` and normalized phone.
  - **Identical**: compare `title`, `firstname`, `lastname`, `gender`, `email`, `birthday`,
    `language` and `action_type`. If all match, count the row as **unchanged** and insert nothing.
  - **Different**: close the old row (`synchronized = 1`, `sync_status = 'superseded'`,
    `sync_note = 'replaced by upload <ts>'`), insert the new one, and count it as **replaced**.
  - **None**: insert the row and count it as **new**.

  A partial unique index `ux_pod_pending_partner_phone ON partner_onboarding_data(LOWER(TRIM(partner)), mobile_number) WHERE synchronized = 0`
  enforces the rule. `INSERT OR IGNORE` becomes a plain `INSERT`, so a violation surfaces instead
  of disappearing. The response keeps `total`, `inserted` and `skipped` (= unchanged) for the
  existing wizard, and adds `replaced` and `unchanged`.
- **Rationale**: Fixes E7. The dedup key ignores language, so an employee who switches language
  is a replacement, not a second pending row.
- **Alternatives**: Dedup only at sync time — rejected, because the pending counts stay inflated
  (US6).

### D6 — Partner identity comes from the partner JWT, not the form (security, supports FR-013)

- **Decision**: `/upload-csv` decodes `partner-usr` (as `/partner-auto-login` already does) and
  uses `partner.title` from the token. A body `partner` that differs is ignored.
- **Rationale**: With Q2 = move, an add can transfer a card between partners (E8). Taking the
  partner from the token means only an authenticated contact of Partner B can create a move into
  Partner B, and an admin still reviews every sync.
- **Alternatives**: Leave as is — rejected, because it makes card takeover a one-field form edit.
  `GET /partner-delivery-info` has the same pattern but only reads data. It is noted, and left
  out of scope.

### D7 — Sync engine: process each row by id, with an explicit outcome (FR-007, FR-009–FR-015, FR-021, FR-023, FR-024)

- **Decision**: The sync keeps the single `db.transaction`. For each pending row of the partner
  and language (no age window), it normalizes the phone, looks up all cards with that phone, and
  splits them into same-partner and other-partner cards using the existing umlaut-folded partner
  comparison. It then applies the row as follows.

  | Action | Same-partner card | Only other-partner card | No card |
  |---|---|---|---|
  | `update` | Update details (gender `m/f→Herr/Frau`, else keep; birthday `COALESCE`), set active → `synchronized` | → `conflict` (note: owner) | → `not_found` |
  | `delete` | Set `active = 0` → `synchronized` | → `conflict` | → `not_found` |
  | `add` | Guard: active, and synced for **this** partner within 3 months → `already_active`. Otherwise update, reactivate and set type and expiry → `synchronized` | **Move** the most recent card (active first, then highest id): set partner, details, type and expiry, `active = 1`, `remarks = 'moved from <A> to <B> <ts>'`; record in `moves[]` → `synchronized` | Insert with the next card number in the language's range; queue an invitation → `synchronized` |

  Losers of the defensive latest-per-phone dedup are closed as `superseded`. Each staged row is
  closed with `UPDATE … WHERE id = ?`. The response adds `moved`, `superseded`, `not_found`,
  `conflict`, `already_active`, `invitations_queued`, `moves[]` and `conflicts[]`, and keeps
  `updated`, `inserted` and `deactivated`.
- **Rationale**:
  - Closing by id makes FR-011 hold by construction.
  - The 3-month guard becomes partner-scoped. Otherwise an employee added by A last month could
    never move to B, which contradicts Q2.
  - A move keeps the card number and wallet pass (spec assumption).
  - Update and delete never cross partners (FR-013a).
  - Re-running the sync finds no pending rows, so it is idempotent (FR-024). E9 serializes
    concurrent clicks.
- **Alternatives**: Keep the batch-level `UPDATE … WHERE partner AND mobile_number` statements —
  rejected, because they can't tell "not found" from "applied".

### D8 — Pending counts: no age window; per-language split; oldest date (FR-012a, FR-022, FR-022a)

- **Decision**: Remove `metadata_createdAt >= datetime('now','-1 month')` from sync Step 0,
  `/api/member-card-partner-stats` and `/api/partner-onboarding-pending-counts`. Both endpoints add
  `pending_en`, `pending_de` and `oldest_pending` (and keep `available_update` / `pending_count` as
  totals).
  - **Corporate Member**: the Available Update cell shows `EN n · DE m`. It shows a warning chip
    "> 30 days" (tooltip: oldest date) when `oldest_pending` is older than 30 days. The EN Sync
    button shows only when `pending_en > 0`.
  - **Delivery Tracking**: "Sync (DE)" is disabled when the selected partner's `pending_de = 0`.
  - **Both**: snackbars show the new outcome counts and list moves and conflicts.
- **Rationale**: Covers US3.4, US3.5 and US7 with small UI changes in the components that already
  exist.

### D9 — Schema delivery (E11)

- **Decision**:
  - **`create_tables.sql`**: fix the stray `;` and add the three columns and the partial unique index.
  - **New `migrate_partner_onboarding_sync_status.sql`** at the repo root, idempotent where
    SQLite allows, with these steps:
    1. Add the columns.
    2. Backfill `sync_status = 'synchronized'` and `sync_note = 'closed before 016'` for
       `synchronized = 1`.
    3. Normalize the phones of pending rows.
    4. Supersede older pending duplicates.
    5. Create the index.
  - Wrongly closed rows are not reopened (spec assumption).
- **Rationale**: Follows the repo convention set in #74 (no runtime migrations).

### D10 — Documentation (FR-025)

- **Decision**: Update `PARTNER_ONBOARDING_WORKFLOW.md`:
  - Correct §4.1 and §7.2 (the DE sync exists).
  - Describe the row states, moves, partner-from-JWT, the 30-day flag and the phone and birthday
    formats.
  - Turn §7 into a "Resolved in 016" table.

## Open items

None. All spec clarifications were resolved on 2026-10-26, and no `NEEDS CLARIFICATION` remains
in the Technical Context.
