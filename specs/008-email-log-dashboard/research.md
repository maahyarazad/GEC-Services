# Phase 0 Research: Do-Not-Reply Email Log

All unknowns surfaced while drafting the spec/plan are resolved here. Each item follows
Decision / Rationale / Alternatives.

## R1. Is there any existing record of sent emails to display?

**Decision**: No. There is no email-log table and no persisted send record. Logging must be added;
the feature is **forward-only** (shows sends from the moment it ships).

**Rationale**: Grep across the repo (excluding `node_modules`) found no email-log table in
`create_tables.sql`, no model, and no route storing sends. `services/emailService.js` only emits
`console.log(\`${Date.now()} - Email sent:\`, response.messageId)` on success. Those lines land in
PM2 logs (`logs/*.log`, surfaced by the existing `ServerLogs` section) but carry only a message id —
**not** the recipient or a category — so they cannot be reliably backfilled into a structured,
searchable, categorised log.

**Alternatives considered**:
- *Parse PM2 logs to backfill history* — rejected: the log lines lack recipient and category, the
  format is inconsistent across transports, and parsing free-text logs is brittle. A clean,
  structured forward-only log is simpler and more trustworthy.
- *A new separate datastore / log service* — rejected as over-engineering for one table (see R3).

## R2. Where should the logging call go, and what counts as "do-not-reply"?

**Decision**: Instrument the single shared transport `sendRawEmailWithAttachments()` in
`services/emailService.js`. Add an optional `category` argument; after `transporter.sendMail(...)`
resolves (or throws) call a best-effort `emailLogService.logEmailSend({ category, to, subject,
status, error })`. Each high-level send function passes its category. **Do not** instrument
`sendRawEmailWithAttachments_AppSupport()`.

**Rationale**: Every do-not-reply email funnels through `sendRawEmailWithAttachments`, which sends
from `process.env.SMTP_SENDER` = `do-not-reply@german-emirates-club.com`. Instrumenting that one
function captures all ~12 send types at a single site (one DB-write code path), and automatically
scopes the log to do-not-reply mail. `…_AppSupport` sends from `app.support@…` — a different sender,
not in scope — so it is excluded by simply not instrumenting it. The ~12 callers
(`event_confirm_registration_email`, `email_otp`, `membership_pass_email`, `send_party_invitation`,
`sendBatchEmails`, …) each already call `sendRawEmailWithAttachments`, so passing a category string
is a one-line change per caller.

**Alternatives considered**:
- *Log inside each high-level function* — rejected: ~12 near-identical insert calls to maintain;
  easy to miss one. Centralising at the transport is DRY and complete by construction.
- *Log at the lowest level for every transport (`sendEmail`, SES path, `_AppSupport`)* — rejected:
  would capture support mail too and muddy the "do-not-reply" framing; those paths are unused/dead
  (`sendEmail` has a dead SES block) or out of scope.

## R3. Where to store the log?

**Decision**: One new SQLite table `email_log` in the existing `app.db`, accessed through
`services/dbService.js` (`getDB()`), created by an idempotent `CREATE TABLE IF NOT EXISTS` migration
that runs at router load — exactly as `routes/knowledge_base.js` does for `knowledge_base_view_log`.
Mirror the DDL in `create_tables.sql`.

**Rationale**: The project already standardises on `better-sqlite3` for operational/log data and has
a clean, copyable precedent (`knowledge_base_view_log`) for a small append-only log with
startup migration + `create_tables.sql` documentation. `better-sqlite3` is synchronous and fast;
a single indexed INSERT is negligible. No new infrastructure, no new dependency.

**Alternatives considered**:
- *MongoDB* (present via the backup job) — rejected: operational data lives in SQLite here; adding a
  Mongo collection would split the storage model for no benefit.
- *Append to a flat file* — rejected: searching/paging/counting by category would require re-parsing
  a growing file; SQL indexes give this for free.

## R4. Best-effort logging — how to guarantee it never breaks a send

**Decision**: `logEmailSend()` wraps its own body in try/catch and logs any failure to `console`
only; it is called from within `sendRawEmailWithAttachments` in a way that cannot change that
function's return value or thrown error. On the **failure** path, the existing
`catch (error) { … throw error }` records a `failed` entry (best-effort) *before* re-throwing, so the
caller's behaviour is unchanged.

**Rationale**: FR-003 / SC-004 require delivery to be unaffected. `better-sqlite3` writes are
synchronous, so ordering is deterministic; wrapping in try/catch isolates any DB error. Recording
failed attempts (R2 failure path) directly serves the "a recipient says they never got it" edge
case.

**Alternatives considered**:
- *Fire-and-forget async queue* — unnecessary for a synchronous single-row insert; adds complexity.
- *Only log successes* — rejected: loses the most valuable diagnostic case (failed sends).

## R5. Category taxonomy

**Decision**: Stable category *keys* with human-readable *labels*, derived from the existing send
functions, plus a catch-all. Keys are stored in `email_log.category`; labels are a small map shared
conceptually between the API response and the client. Proposed set:

| key | label | source function(s) |
|-----|-------|--------------------|
| `event-registration` | Event Registration Confirmation | `event_confirm_registration_email`, `event_confirm_registration_email_aws`, `event_confirm_registration_email_with_invoice` |
| `confirmation-message` | Confirmation Message | `comfirm_message_email` |
| `membership-pass` | Membership Pass | `membership_pass_email` |
| `membership-card` | Membership Card | `emailMembershipCard` |
| `membership-invitation` | Membership Invitation | `membership__invitation` |
| `otp` | OTP / Login Code | `email_otp` |
| `request-received` | Request Received | `email_request_received` |
| `company-data-confirmation` | Company Data Confirmation | `company_data_confirmation_email` |
| `password-reset` | Password Reset | `gic__reset_password` |
| `party-invitation` | Party Invitation | `send_party_invitation` |
| `venue-courtesy` | Venue Courtesy Message | `membership_courtacy_at_venue_message` |
| `newsletter-batch` | Newsletter / Batch | `sendBatchEmails` |
| `uncategorised` | Other / Uncategorised | any caller that passes no category |

**Rationale**: Mirrors the real send functions one-to-one (SC-005), so every active email type is
represented. Stable keys survive label wording changes and are safe to query/index. The catch-all
guarantees no send is dropped from the log even if a future caller forgets to pass a category.

**Alternatives considered**:
- *Admin-editable categories* — rejected for v1 (YAGNI; no request for it).
- *Derive category from subject text* — rejected: brittle and locale-dependent; the calling function
  is the ground truth.

## R6. Dashboard integration pattern

**Decision**: Append one entry to `tabConfig` in `public/src/components/Dashboard/Dashboard.jsx`
(label "Email Logs", an MUI/react-icons mail icon), add a `React.lazy` import for a new
`EmailLogs` component, and add the matching `case` to the index-based content switch. Append only —
existing indices are preserved.

**Rationale**: This is exactly how every current section is wired (`ServerLogs`, `KnowledgeBase`,
`DeliveryTracking`, …). The switch is keyed by numeric tab index, so inserting mid-list would
renumber every later section and break deep links (`?tab=…` slugs are derived from labels, but the
switch is positional). Appending is the zero-risk choice.

**Alternatives considered**:
- *Insert the tab in a "logical" position* — rejected: renumbers the positional switch for no user
  benefit; a new tab at the end is conventional here.

## R7. Fetching, searching, and paging on the client

**Decision**: The `EmailLogs` component fetches from the two admin endpoints with
`fetch(\`${import.meta.env.VITE_SERVERURL}/api/email-log/…\`, { credentials: 'include' })`, matching
every other Section. The category list comes from `/categories`; selecting a category or typing in
the top search bar calls `/entries` with `category` / `search` / `page` query params. Entries render
in the existing `CustomDataGrid` (or a simple MUI table) with columns **Sent (date-time)**,
**Recipient**, **Category**, **Status**. Search is debounced and sent to the server so it spans the
whole log, not just the loaded page (FR-008).

**Rationale**: Consistency with `DeliveryTrackingSection` / `PartnerOnboardingSection` (same fetch
shape, same grid). Server-side search + paging keeps payloads bounded (FR-007) and makes
recipient search authoritative across all entries regardless of what is currently on screen.

**Alternatives considered**:
- *Client-side-only search over a full dump* — rejected: unbounded payload as the log grows;
  violates FR-007.
