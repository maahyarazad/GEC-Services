# Quickstart & Validation: Do-Not-Reply Email Log

A run/validation guide proving the feature works end-to-end. It assumes the implementation from
[plan.md](./plan.md) is in place. For data shapes see [data-model.md](./data-model.md); for the HTTP
contract see [contracts/email-log-api.md](./contracts/email-log-api.md).

## Prerequisites

- Node backend runnable locally (`npm run dev` at repo root → `nodemailer`/SMTP env set in `.env`;
  `SMTP_SENDER=do-not-reply@german-emirates-club.com`).
- Client dev server: in `public/`, `npm run dev` (Vite). `VITE_SERVERURL` points at the backend.
- An admin login (the dashboard `/admin` login code) so the `a-usr` cookie is set — the API is
  admin-guarded.
- SQLite `app.db` present (it is). The `email_log` table is created automatically on first load of
  the new router (idempotent migration); no manual migration step.

## Setup

1. Start backend: `npm run dev` (repo root).
2. Start client: `cd public && npm run dev`.
3. Log in to the admin dashboard at `/admin`.

## Validation scenarios

Each maps to a user story / acceptance scenario in [spec.md](./spec.md).

### V1 — Table auto-creates, logging is wired (US1 / FR-001, FR-002)

1. Start the backend fresh. Confirm no crash and that `email_log` exists:
   `sqlite3 app.db ".schema email_log"` → shows the DDL from data-model.md.
2. Trigger one do-not-reply email per category (e.g. request an OTP → `otp`; complete a test event
   registration → `event-registration`). The simplest single check: request an OTP from the member
   login.
3. Confirm a row was written: `sqlite3 app.db "SELECT category, recipient, status, created_at FROM
   email_log ORDER BY id DESC LIMIT 5;"` → the OTP send appears with `category='otp'`,
   `status='sent'`, a recipient, and an epoch-ms `created_at`.

**Expected**: every triggered send produces exactly one row per recipient; no send fails or slows.

### V2 — Category list renders (US1 / FR-004, FR-005)

1. In the dashboard sidebar, open the new **Email Logs** tab.
2. Confirm a list of categories appears, each with a label and a count, most-active first.

**Expected**: matches `GET /api/email-log/categories`. Categories with zero sends are absent.
Immediately after a fresh install (no sends yet) an informative empty state shows, not an error.

### V3 — Drill-down shows date-time + recipient (US2 / FR-006, FR-007)

1. Click a category (e.g. "OTP / Login Code").
2. Confirm a list/table of that category's entries, newest first, each row showing the **sent
   date-time** (admin locale) and the **recipient** address.
3. Confirm paging/windowing works for a category with many rows (no browser freeze).
4. Click back → return to the category list without a full page reload.

**Expected**: matches `GET /api/email-log/entries?category=otp`.

### V4 — Search bar filters by recipient across categories (US3 / FR-008, FR-009)

1. Send test emails to two distinct addresses (e.g. via two OTP requests to different accounts, or
   one OTP + one event registration).
2. In the top search bar, type one of the addresses.
3. Confirm only that address's entries remain, regardless of category.
4. Clear the search → the un-filtered category view returns.
5. Type an address that was never sent to → the "no matching emails" empty state shows.

**Expected**: matches `GET /api/email-log/entries?search=<address>`; search is server-side so it
spans the whole log, not just the loaded page.

### V5 — Failed sends are recorded, delivery is never broken (Edge cases / FR-003, FR-011, SC-004)

1. Temporarily point SMTP at an invalid host (or otherwise force a send failure) in a test
   environment and trigger a send.
2. Confirm the send path behaves exactly as before (the caller still sees the same thrown error /
   handling — logging changed nothing).
3. Confirm a `status='failed'` row with a short `error` summary was written:
   `sqlite3 app.db "SELECT status, error FROM email_log WHERE status='failed' ORDER BY id DESC LIMIT 1;"`.
4. Separately, simulate a log-write failure (e.g. make the insert throw) and confirm the email send
   still succeeds and the error is only `console.error`'d.

**Expected**: logging is best-effort; it never changes delivery outcome or adds perceptible latency.

### V6 — Admin guard (FR-010)

1. Hit `GET /api/email-log/categories` with no `a-usr` cookie (e.g. `curl` without credentials).
2. Confirm `401` with `{ authenticated: false, … }`.

**Expected**: both endpoints reject unauthenticated requests, like every other admin API.

## Sign-off checklist

- [ ] `email_log` table auto-creates on startup; DDL mirrored in `create_tables.sql`.
- [ ] Every current `emailService.js` send function writes a categorised row (SC-005).
- [ ] `…_AppSupport` (app.support sender) is **not** logged.
- [ ] Category list, category drill-down (date-time + recipient), and top search bar all work.
- [ ] Empty states render for empty log and no-match search.
- [ ] Failed sends are logged; logging never breaks or slows a send.
- [ ] Endpoints are admin-guarded; no write/delete endpoint exists.
- [ ] Existing dashboard tabs keep their original indices (new tab appended).
