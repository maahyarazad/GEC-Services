# Feature Specification: Do-Not-Reply Email Log (Admin Dashboard Section)

**Feature Branch**: `008-email-log-dashboard`

**Created**: 2026-10-13

**Status**: Draft — written during `/speckit-plan` from the user description + codebase research

**Input**: User description: "add another section to the dashboard so admin can see all the
do-not-reply emails log (categorize the emails like a list and when click on a category it will
show the date time and the recipient that email was sent to and also add a search bar on top)"

> **Provenance note**: written during `/speckit-plan`; there was no prior `/speckit-specify`
> conversation. Priorities and success criteria are proposals to confirm. One material gap was
> found during research and resolved in `research.md`: **the app currently keeps no persistent
> record of sent emails** — every `do-not-reply@...` send is only `console.log`'d. This feature
> therefore has to *start recording* sends before it can display them; it shows sends that occur
> from the moment logging ships onward, not a backfill of past sends.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See which kinds of do-not-reply emails are going out (Priority: P1)

An admin opens the dashboard and selects a new **Email Logs** section. They see a list of email
*categories* — one row per kind of system email the platform sends from `do-not-reply@...`
(e.g. "Event Registration Confirmation", "OTP / Login Code", "Membership Pass", "Newsletter /
Batch"). Each row shows how many emails of that kind have been sent, so the admin gets an at-a-glance
picture of outbound system mail without reading raw server logs.

**Why this priority**: This is the entry point and the organising idea of the whole request
("categorize the emails like a list"). Without the category list there is nothing to click into.
It is independently valuable on its own: even with no drill-down, an admin can confirm which email
types are active and roughly how much traffic each produces.

**Independent Test**: Trigger one of each kind of email in a test environment, open the Email Logs
section, and confirm each category appears with a correct count.

**Acceptance Scenarios**:

1. **Given** an authenticated admin on the dashboard, **When** they open the Email Logs section,
   **Then** they see a list of email categories, each with a human-readable label and a count of
   emails sent in that category.
2. **Given** a category has had no emails sent yet, **When** the list renders, **Then** that
   category either does not appear or appears with a count of zero (consistent, not a crash).
3. **Given** the admin is not authenticated, **When** the Email Logs data is requested,
   **Then** the request is rejected (same guard as every other admin section).

---

### User Story 2 - Drill into a category to see each email's time and recipient (Priority: P1)

From the category list the admin taps a category. The view shows the individual emails in that
category as a list, each row showing **the date and time the email was sent** and **the recipient
address it was sent to**. The admin can tell, for example, that an OTP email went to
`jane@example.com` at 14:32 today.

**Why this priority**: This is the core payload of the request ("when click on a category it will
show the date time and the recipient"). US1 without US2 is only a summary; US2 is why an admin comes
to this screen — to answer "did this person get their email, and when?".

**Independent Test**: Send a known email to a known address, open its category, and confirm a row
appears with the correct recipient and a sent timestamp matching the send.

**Acceptance Scenarios**:

1. **Given** the category list, **When** the admin selects a category, **Then** the view shows that
   category's emails, each row with a sent date-time and a recipient address.
2. **Given** a category with many emails, **When** the admin opens it, **Then** the list loads
   without freezing the browser (results are paged or windowed, newest first).
3. **Given** an email that was sent to multiple recipients, **When** the admin views it,
   **Then** each recipient is represented (one row per recipient, or recipients clearly listed).
4. **Given** the admin is viewing a category, **When** they go back, **Then** they return to the
   category list without a full reload.

---

### User Story 3 - Search across the log from a bar on top (Priority: P2)

A search bar sits at the top of the Email Logs section. The admin types part of a recipient address
(or other visible text) and the list narrows to matching entries, regardless of which category they
belong to. Clearing the search restores the normal category/drill-down view.

**Why this priority**: Explicitly requested ("add a search bar on top"), and it is what makes the
log usable at scale — an admin usually arrives asking "did *this address* get mail", not "show me
category X". It is P2 only because US1+US2 already deliver a working, demonstrable section; search
is the efficiency layer on top.

**Independent Test**: Send emails to two distinct addresses, type one address into the search bar,
and confirm only that address's entries remain.

**Acceptance Scenarios**:

1. **Given** the Email Logs section, **When** the admin types text into the top search bar,
   **Then** the displayed entries narrow to those matching the text (by recipient at minimum).
2. **Given** an active search, **When** the admin clears the search bar, **Then** the view returns
   to the un-filtered category list / drill-down.
3. **Given** a search that matches nothing, **When** results render, **Then** an explicit
   "no matching emails" empty state is shown (not a blank screen or spinner).

---

### Edge Cases

- **A send fails** (SMTP error). The log SHOULD still record the attempt with a failed status, so an
  admin searching for a recipient who complains "I never got it" can see the attempt and its outcome
  rather than finding nothing.
- **An email with no clear category** (a transport called from a path not yet labelled). It is
  recorded under a catch-all category (e.g. "Other / Uncategorised") rather than dropped.
- **Very large recipient lists** (batch / newsletter sends). Recording MUST NOT block or noticeably
  slow the send itself.
- **Timezone**: timestamps are stored unambiguously (epoch milliseconds, matching the existing log
  convention) and rendered in the admin's locale.
- **No logging history**: immediately after the feature ships the log is empty until the first send;
  the section shows an informative empty state, not an error.
- **Logging failure**: if writing a log row fails, the email send itself MUST still succeed — logging
  is best-effort and never breaks delivery.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST record a log entry for each do-not-reply email send attempt, capturing
  at minimum: a category, the recipient address, the send timestamp, and the outcome (sent/failed).
- **FR-002**: Each log entry MUST be assigned a category identifying the kind of email (e.g. event
  registration confirmation, OTP, membership pass, newsletter/batch). The category set MUST cover
  every send function the platform exposes today, with a catch-all for anything unlabelled.
- **FR-003**: Recording a log entry MUST be best-effort: a logging failure MUST NOT cause the email
  send to fail, and MUST NOT measurably delay the send.
- **FR-004**: The admin dashboard MUST expose a new **Email Logs** section, reachable the same way as
  existing sections (a tab in the admin sidebar) and guarded by the same admin authentication.
- **FR-005**: The Email Logs section MUST present email categories as a list, each with a
  human-readable label and a count of entries.
- **FR-006**: Selecting a category MUST show that category's individual entries, each displaying the
  sent date-time and the recipient address.
- **FR-007**: Entry lists MUST be ordered newest-first and MUST be paged or windowed so that large
  categories do not freeze the browser.
- **FR-008**: The section MUST provide a search bar at the top that filters entries by recipient (at
  minimum) across categories, with a clear control to reset.
- **FR-009**: When a search or category has no entries, the section MUST show an explicit empty
  state.
- **FR-010**: All Email Logs data MUST be served through endpoints that require admin authentication;
  unauthenticated requests MUST be rejected with the standard 401/403.
- **FR-011**: The feature MUST NOT change the content, sender, recipients, or delivery behaviour of
  any existing email — it only observes and records sends.
- **FR-012**: Log entries MUST NOT store email body content or attachments; recipient address,
  subject (optional), category, timestamp, and status are sufficient and minimise stored personal
  data.

### Key Entities *(include if feature involves data)*

- **Email Log Entry**: one recorded send attempt of a do-not-reply email. Attributes: category
  (which kind of email), recipient (the destination address), sent-at (timestamp, epoch ms),
  status (sent or failed), optional subject, optional error summary when failed. Relationship:
  belongs to exactly one Category.
- **Email Category**: a named kind of system email (label + stable key). Not a stored table
  necessarily — derived from the distinct categories present in the log entries, plus the fixed
  catch-all. Relationship: has many Email Log Entries.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can go from opening the dashboard to seeing the list of email categories in no
  more than two interactions (open section → list is present).
- **SC-002**: For any email sent after the feature ships, an admin can locate that email's entry
  (correct recipient and sent time) within 30 seconds using the category drill-down or the search
  bar.
- **SC-003**: Recipient-address search returns the matching entries for a typed address with no
  category knowledge required.
- **SC-004**: Enabling logging adds no user-perceptible delay to email sending (send latency
  unchanged within normal variance) and never causes a send to fail that would otherwise succeed.
- **SC-005**: 100% of the platform's current send functions produce a categorised log entry when
  exercised (verified by triggering each once).

## Assumptions

- **Forward-only**: the log reflects emails sent from the moment the logging code ships; historical
  sends (which were never persisted) are out of scope. See `research.md`.
- **Categories = send functions**: the category taxonomy is derived from the existing
  `services/emailService.js` send functions; a catch-all "Other / Uncategorised" covers anything
  else. No admin-editable category management in v1.
- **Storage reuses the existing SQLite database** (`app.db` via `services/dbService.js`), following
  the idempotent-migration pattern already used by `knowledge_base_view_log`. No new datastore.
- **Admin-only**: the section is for authenticated dashboard admins; it reuses
  `middleware/auth.authorize_admin`. No member-facing view.
- **Retention**: entries are retained indefinitely in v1; a retention/pruning policy is out of scope
  but noted as a future consideration given the data is personal (recipient addresses).
- **The existing dashboard tab mechanism** (index-based `tabConfig` + lazy section switch in
  `Dashboard.jsx`) is the integration point; the new section is appended so existing tab indices
  are unchanged.
