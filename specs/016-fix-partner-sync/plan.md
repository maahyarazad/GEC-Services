# Implementation Plan: Partner employee list sync — reliability fixes

**Branch**: `016-fix-partner-sync` | **Date**: 2026-10-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/016-fix-partner-sync/spec.md`

## Summary

This plan fixes the nine defects in the partner employee list flow (`PARTNER_ONBOARDING_WORKFLOW.md` §7) and builds in the three clarifications (separate German sync, cards move between partners, no expiry with a 30-day flag).

**Approach.** Each staged row gets an explicit lifecycle (`sync_status`). Sync then closes rows **one by one, by id**, each with its own outcome, replacing today's broad "mark everything synchronized" update. That one change fixes the language leak (issue 2) and the silent closing of superseded duplicates (issue 3). It also makes "not found", "conflict" and "moved" visible to the admin. The remaining fixes:

| Issue | Fix |
|---|---|
| Phones (4, 5) | A shared `normalizePhone` helper is used at upload and at sync. |
| Birthdays (6) | Formatted on the client, parsed strictly on the server. Empty values never overwrite a card. |
| Re-uploads (8) | Upload replaces an employee's pending row, backed by a partial unique index, and reports new/replaced/unchanged counts. |
| Expiry (9) | The 1-month window is removed everywhere. Stats return per-language counts and the oldest pending date for the "> 30 days" chip. |
| Invitations (1) | `sendBatchEmails` accepts any iterable and isolates each failure. Sync passes the inserted `member_card` rows. |
| Card moves (7) | A cross-partner add moves the card. Update and delete never cross partners. |

**Hardening.** Because a card can now move to another partner, `/upload-csv` takes the partner from the partner JWT instead of the form field (see research D6).

**Correction to the workflow doc.** "Sync (DE)" already exists in Delivery Tracking. It only needs a disabled state and the Step 4 fix.

## Technical Context

**Language/Version**: Node.js (CommonJS) + Express backend; React 18 + Vite + TypeScript/JSX frontend (`public/`)

**Primary Dependencies**: `better-sqlite3`, `csv-parse/sync`, `multer`, `jsonwebtoken` (backend); `exceljs`, `libphonenumber-js`, MUI (frontend). No new dependencies.

**Storage**: SQLite `app.db`. `partner_onboarding_data` gets 3 columns and 1 partial unique index. `member_card` has no schema change.

**Testing**: No automated runner (`npm test` is a stub). Validation follows [quickstart.md](./quickstart.md) (7 scenarios, audit SQL and an idempotency check) plus `node -e` checks of the pure helpers.

**Target Platform**: Linux server, PM2, single fork-mode instance (production); macOS (development)

**Project Type**: Web application (Express API + React SPA)

**Performance Goals**: A sync of up to 500 rows completes in under 2 s. It is a synchronous transaction, and every per-row lookup uses `mobile_number`. Invitations for 500 members finish in about 3.5 min, within the 15 min SC-001 target.

**Constraints**:
- Existing readers of `synchronized != 1` must keep working unchanged.
- Response fields `updated`, `inserted`, `deactivated` and `skipped` stay, because current UIs read them.
- No runtime migrations (#74). Schema changes go in `create_tables.sql` plus a one-off root `.sql` script.

**Scale/Scope**:
- 4,664 cards and about 200 staged rows today.
- Touches 2 route files, 2 helpers, 3 frontend components, the schema, 1 migration script and 1 doc.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template, so there are no ratified principles and no gates to evaluate. **PASS (N/A)**.

Re-checked after Phase 1 design: still N/A, with no violations to justify. The design follows the repo conventions from earlier features: schema changes in `create_tables.sql` plus a root `.sql` script, and no new dependencies.

## Project Structure

### Documentation (this feature)

```text
specs/016-fix-partner-sync/
├── spec.md
├── plan.md                 # This file
├── research.md             # Phase 0: evidence E1–E12, decisions D1–D10
├── data-model.md           # Phase 1: staged-row lifecycle, member_card write rules
├── quickstart.md           # Phase 1: validation scenarios + audit SQL
├── contracts/
│   ├── upload-csv.md       # POST /upload-csv
│   └── member-card-sync.md # POST /api/member-card-sync + pending-count endpoints + UI contract
├── checklists/
│   └── requirements.md
└── tasks.md                # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
helpers/essentials.js                         # + normalizePhone, parseBirthday (exported)
services/emailService.js                      # sendBatchEmails: Array.from + Promise.allSettled + per-item error_log
routes/partner_onboarding.js                  # /upload-csv: partner from JWT, normalized phone + birthday,
                                              #   replace/unchanged dedup, plain INSERT, new counts
routes/member_card.js                         # /api/member-card-sync rewrite (per-row outcomes, moves, close by id);
                                              #   stats + pending-counts: no window, pending_en/de, oldest_pending
create_tables.sql                             # fix stray ';', + sync_status/synced_at/sync_note, partial unique index
migrate_partner_onboarding_sync_status.sql    # NEW one-off script for existing DBs (D9)
public/src/components/PartnerOnboarding/
├── validateAndConvertXlsx.tsx                # Date cells → YYYY-MM-DD (UTC), warnings[] for unreadable birthdays
└── PartnerOnboarding.tsx                     # Review step lists warnings; shows new/replaced/unchanged
public/src/components/Sections/
├── MemberCardDataGrid.jsx                    # EN·DE pending split, "> 30 days" chip, richer sync snackbar (moves/conflicts)
└── DeliveryTrackingSection.jsx               # Sync (DE) disabled when pending_de = 0; richer snackbar
PARTNER_ONBOARDING_WORKFLOW.md                # corrected behaviour + "Resolved in 016" (FR-025)
```

**Structure Decision**: This is the existing web-app layout, with the Express routers in `routes/`, shared code in `helpers/` and `services/`, and the React SPA in `public/src`. No new modules are created. The two pure helpers live in `helpers/essentials.js` next to `chunkArray`, which the sync and upload already share.

## Implementation order (for /speckit-tasks)

1. **Foundation**:
   - Add the helpers: `normalizePhone`, `parseBirthday`, and `sendBatchEmails` hardening.
   - Make the schema change in `create_tables.sql` and write the migration script.
2. **US1 + US2 + US3 (P1)**:
   - Rewrite the sync engine: per-row outcomes, close by id, phone normalization, the language
     scope, and inserted cards passed to the invitation queue.
   - Upload stores the normalized phone and takes the partner from the JWT.
3. **US4 (P2)**: card moves, cross-partner conflicts, and the partner-scoped 3-month guard.
4. **US5 (P2)**: birthday handling on the client and server, `COALESCE` on update, and wizard
   warnings.
5. **US6 (P3)**: upload replace/unchanged dedup and the new counts.
6. **US7 (P3)**: remove the age window; add `pending_en`/`pending_de`/`oldest_pending`; build the
   UI chip, the EN·DE split and the DE button disabled state.
7. **Docs**: update `PARTNER_ONBOARDING_WORKFLOW.md` and run the quickstart.

## Risks

| Risk | Mitigation |
|---|---|
| The migration runs on a production DB that has pending duplicates, so creating the index would fail | The script supersedes older duplicates **before** creating the index (D9) |
| Partners still running the old wizard bundle post `partner` in the body | The body value is ignored and the JWT value used, so old clients keep working |
| A moved card's `remarks` is overwritten by the next sync of the new partner | Accepted. The move is also recorded on the staged row (`sync_note = 'moved from <A>'`), which is permanent |
| Other code reads `partner_onboarding_data.mobile_number` with a `+` | Only `member_card` is joined on it (`/api/partner-onboarding`), and that join starts to match **more** rows. No reader depends on the `+` |

## Complexity Tracking

No constitution violations to justify.
