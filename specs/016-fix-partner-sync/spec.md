# Feature Specification: Partner employee list sync — reliability fixes

**Feature Branch**: `016-fix-partner-sync`

**Created**: 2026-10-26

**Status**: Implemented (pending manual app checks)

**Input**: User description: "Fix the issues found in Partner Onboarding — Employee List Submission & Synchronization (see `PARTNER_ONBOARDING_WORKFLOW.md`, section 7): (1) sync invitation emails are never sent; (2) the 'mark synchronized' step ignores language, so pending German rows are closed without being applied; (3) superseded duplicate rows are closed without any record; (4) add matches phones without '+' while update/delete match the raw value; (5) the server stores the raw Mobile Number instead of the cleaned Normalized value; (6) the birthday conversion is computed but not stored; (7) an add can update another partner's card; (8) re-uploads always stage duplicate rows and 'skipped' is always 0; (9) pending rows expire after one month."

## Background

A partner's HR contact submits an employee list through the onboarding wizard. Each row says
whether the employee is to be **added**, **updated** or **deleted**. The rows wait as *pending
changes* until a GEC admin presses **Sync** for that partner, and Sync applies them to the live
corporate membership cards.

Reading the code turned up nine defects in this flow. Some lose data without telling anyone.
Others mean the admin's action has no effect, or the wrong card is changed. The local database
shows the scale:

- 179 of the 194 staged rows store the phone with a leading `+`, while live cards store digits only.
- Every staged birthday is empty.
- One German-language row was marked synchronized but never produced a card.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New members receive their invitation after a sync (Priority: P1)

An admin syncs a partner whose list adds 30 new employees. Each of the 30 receives the membership
invitation email shortly afterwards. The admin no longer has to press **Resend Invitation** as a
workaround.

**Why this priority**: The invitation is how a new member learns about the card and claims the
wallet pass. Today no invitation is sent after any sync, so every onboarded employee is stuck
until an admin notices.

**Independent Test**: Stage a list with 3 new employees for a test partner and sync it. All 3
invitation emails appear in the email log within a few minutes, and the sync result reports 3
invitations queued.

**Acceptance Scenarios**:

1. **Given** a pending list with N new employees, **When** the admin syncs the partner, **Then**
   exactly N invitation emails are sent, one per newly created card.
2. **Given** a pending list with only updates and deletes, **When** the admin syncs, **Then** no
   invitation emails are sent.
3. **Given** one invitation fails to send, **When** the sync runs, **Then** the other invitations
   still go out, the failure is recorded in the error log, and the cards stay created.
4. **Given** a sync has finished, **When** the admin reads the sync result, **Then** it shows how
   many invitations were queued.

---

### User Story 2 - Update and delete rows reach the right card (Priority: P1)

HR marks an employee as **delete** because they left the company, or as **update** because their
surname changed. After sync, that employee's card is deactivated or updated, whether or not HR
typed the phone number with a `+`, spaces or dashes.

**Why this priority**: Today, update and delete rows whose phone has a `+` match no card. The admin
sees a successful sync, but leavers keep an active card. That is both a cost and an access-control
problem.

**Independent Test**: Give a card the phone `971501234567`. Stage a **delete** row for
`+971 50 123 4567` for the same partner and sync. The card becomes inactive and the result reports
1 deactivated.

**Acceptance Scenarios**:

1. **Given** a card with phone `971501234567`, **When** a delete row for `+971-50-123-4567` is synced,
   **Then** that card is deactivated.
2. **Given** a card with phone `971501234567`, **When** an update row for `+971501234567` is synced,
   **Then** that card's details are updated.
3. **Given** HR submits a list, **When** the rows are staged, **Then** each row stores the phone in
   the same standard format live cards use (country code and digits only, no `+`, spaces or
   punctuation). This is the value the wizard validated, not the raw column.
4. **Given** an update or delete row matches no card for that partner, **When** the sync runs,
   **Then** the result reports the row as "not found" instead of counting it silently as done.

---

### User Story 3 - German-speaking employees get their own sync (Priority: P1)

A partner's list mixes English-speaking and German-speaking employees. The **Sync** button in the
Corporate Member section applies the English rows only. The German rows stay pending, and an admin
syncs them separately from the **Delivery Tracking** section once they are ready to arrange the
physical card delivery. No pending row is closed unless it was actually applied.

**Why this priority**: Today a sync handles English rows only but closes German rows as well. Those
employees never get a card, and nothing shows that they were skipped.

**Independent Test**: Stage 2 English and 2 German add rows for one partner. Press Sync in
Corporate Member: 2 red cards are created and both German rows are still pending. Then press the
German sync in Delivery Tracking: 2 blue cards are created and the German rows are synchronized.

**Acceptance Scenarios**:

1. **Given** pending rows in both languages, **When** the admin presses Sync in Corporate Member,
   **Then** only the English rows are applied and closed, and every German row stays pending.
2. **Given** pending German rows for a partner, **When** the admin opens that partner in Delivery
   Tracking, **Then** a sync control is available that applies only that partner's German rows.
3. **Given** the admin presses the German sync, **When** an add is applied, **Then** the card is a
   blue (non-paid) card with a number in the German range, and the member receives an invitation.
4. **Given** German rows stay pending after an English sync, **When** the admin views the partner
   table in Corporate Member, **Then** the pending count shows English and German pending rows
   separately, so the admin knows a German sync is still outstanding.
5. **Given** a partner has no pending German rows, **When** the admin opens it in Delivery
   Tracking, **Then** the German sync control is disabled.

---

### User Story 4 - A member who changes jobs moves to the new partner (Priority: P2)

An employee changes jobs from Partner A to Partner B, and Partner B's HR uploads them as an
**add**. When the admin syncs Partner B, the existing card moves to Partner B: it gets the new
details, becomes active, and its remarks record the move. The card is never left in a mixed state,
with Partner B's details but Partner A as the owner.

**Why this priority**: Today such an add overwrites the name, email and expiry of Partner A's card
and reactivates it, while the card still says Partner A. One partner's upload changes another
partner's member data, and the card ends up belonging to the wrong company.

**Independent Test**: Give Partner A an active card with phone `971500000001`. Stage an add for the
same phone under Partner B and sync Partner B. The card now belongs to Partner B, has B's details
and keeps its card number. Its remarks say it moved from Partner A, and the sync result lists the
move.

**Acceptance Scenarios**:

1. **Given** a card owned by Partner A, **When** Partner B's add for the same phone is synced,
   **Then** the card's owner becomes Partner B, its details and expiry are refreshed, and it is
   active.
2. **Given** a card has moved, **When** the admin reads the card's remarks, **Then** they show the
   previous partner, the new partner and the date of the move.
3. **Given** a card has moved, **When** the admin reads the sync result, **Then** the move is listed
   with the phone and the previous partner, so it can be reviewed before the next step.
4. **Given** an add for a phone already held by an *inactive* card of the **same** partner,
   **When** synced, **Then** that card is reactivated and updated, as today.
5. **Given** an **update** or **delete** row for a phone whose card belongs to a different partner,
   **When** synced, **Then** the card is not changed, and the row is reported as a conflict with
   the owning partner. Only an add may move a card.

---

### User Story 5 - Birthdays from the employee list are kept (Priority: P2)

HR fills in the Date of Birth column. After sync, the member card shows that birthday in one
consistent date format.

**Why this priority**: Birthdays appear on the member record and in exports. Today none survive
the upload. The wizard drops Excel date cells, and the server ignores its own date conversion.

**Independent Test**: Upload a list with three birthdays: an Excel date cell, the text `25/09/1995`
and the text `1995-09-25`. All three are staged and synced as 25 September 1995.

**Acceptance Scenarios**:

1. **Given** a Date of Birth given as an Excel date, `DD/MM/YYYY` or `YYYY-MM-DD`, **When** the list
   is submitted, **Then** the staged row stores it as a calendar date (year-month-day).
2. **Given** a Date of Birth that cannot be read as a date, **When** the list is submitted, **Then**
   the birthday is left empty, the rest of the row is still accepted, and the wizard warns about
   that row before submission.
3. **Given** an empty Date of Birth, **When** synced as an update, **Then** an existing birthday on
   the card is not wiped.

---

### User Story 6 - Re-uploads don't pile up duplicates, and the counts are honest (Priority: P3)

HR uploads the list, notices a typo, and uploads the corrected list an hour later. Each employee
then has one pending change, the latest one. The submission summary says how many rows were new,
replaced or unchanged.

**Why this priority**: Today every re-upload adds a full second copy of the list. The "skipped"
count is always 0, and the admin's "available updates" number is inflated, which hides what really
changed.

**Independent Test**: Upload a 10-row list, then upload it again unchanged. The partner still has
10 pending rows and the second upload reports 10 unchanged. Upload it a third time with one row
edited. The result reports 1 replaced and 9 unchanged.

**Acceptance Scenarios**:

1. **Given** an employee (partner + phone) already has a pending row, **When** HR uploads a row for
   the same employee, **Then** the new row replaces the pending one. Only one pending row per
   employee per partner exists.
2. **Given** the new row is identical to the pending one, **When** uploaded, **Then** it is counted
   as unchanged (skipped), and nothing new is staged.
3. **Given** a row is replaced before sync, **When** the admin looks at that employee's history,
   **Then** the replaced row is recorded as superseded, not as synchronized.
4. **Given** a sync applies the newest row for an employee, **When** older pending rows for the
   same employee still exist, **Then** they are marked superseded, not synchronized. The sync result
   reports how many were superseded.

---

### User Story 7 - Pending changes don't silently expire (Priority: P3)

A partner submits a list and the admin is away for five weeks. When the admin comes back, the
partner's changes are still pending and still sync normally. The partner table flags them as
older than 30 days, so the admin knows the list may be stale and can check with the partner first.

**Why this priority**: Today rows older than one month disappear from the pending count and can
never be synced. The partner believes the submission is done, and the admin never sees it.

**Independent Test**: Stage a row dated 40 days ago for a test partner. The partner appears in the
partner table with 1 pending update and an "older than 30 days" flag. Syncing applies the row, and
the flag disappears.

**Acceptance Scenarios**:

1. **Given** a pending row older than 30 days, **When** the admin views the partner table, **Then**
   the row counts towards the partner's pending updates, and the partner carries an "older than 30
   days" flag.
2. **Given** a pending row older than 30 days, **When** the admin syncs that partner, **Then** the
   row is applied like any other.
3. **Given** a partner has only pending rows younger than 30 days, **When** the admin views the
   partner table, **Then** no flag is shown.
4. **Given** a flagged partner, **When** the admin hovers over or opens the flag, **Then** it shows
   the date of the oldest pending row.

---

### Edge Cases

- A list contains the same phone twice with different actions, for example add then delete. The
  wizard already rejects duplicate phones within one file. Across uploads, the latest row wins
  (User Story 6).
- An update or delete targets a phone with no card for that partner. The row is reported as "not
  found" and closed. It is not retried forever.
- An add targets a phone whose card for the same partner is active and was synced within the last
  3 months. The existing guard still applies: the row is skipped and reported as "already active".
- A phone has a different country-code style, such as `00971…` or `0501234567` with no country
  code. The wizard already requires a valid international number. Normalization turns `00` into
  the country code and strips all punctuation. Local-only numbers are rejected by the wizard, as
  today.
- Two admins press Sync for the same partner at the same moment. Each pending row is applied at
  most once, and the second sync finds nothing left to do.
- Invitation sending is still running when the server restarts. This is accepted as a known limit:
  unsent invitations can be recovered with **Resend Invitation**, which targets active members
  without a wallet pass.
- Existing pending rows were staged before this fix, with `+` phones and raw values. They are
  brought into the standard phone format before the first sync after release, so they still match.
- Rows that were already closed in error before release (German rows marked synchronized without
  a card; the local database has one) are not re-opened automatically. An admin can ask HR to
  re-submit them.
- A moved card already has a wallet pass issued under the old partner. The card keeps its number
  and pass, and only the partner and details change.
- A card moves and the same partner's list also deletes that phone. The latest row for the
  employee wins, as with any other duplicate.

## Clarifications

### Session 2026-10-26

- Q: Should one Sync apply both languages, or should German rows wait for a separate sync? → A:
  Separate. Corporate Member Sync handles English rows. Delivery Tracking gets a German sync
  (FR-010, FR-012a, FR-012b).
- Q: When an add's phone belongs to another partner's card, skip it or move the card? → A: Move
  the card to the new partner and record the move (FR-013, FR-013a, FR-015).
- Q: What happens to pending rows older than one month? → A: They never expire and sync normally,
  but the partner table flags rows older than 30 days (FR-022, FR-022a).

## Requirements *(mandatory)*

### Functional Requirements

**Invitations (issue 1)**

- **FR-001**: After a sync commits, the system MUST send one membership invitation to every card
  that the sync newly created.
- **FR-002**: Invitations MUST go out in the existing throttled batches (25 per batch, 10 s apart),
  and MUST NOT delay the admin's sync response.
- **FR-003**: A failed invitation MUST be recorded in the error log. It MUST NOT stop the remaining
  invitations or roll back the sync.
- **FR-004**: The sync result MUST include the number of invitations queued.

**Phone numbers (issues 4 and 5)**

- **FR-005**: The system MUST store every staged phone number in the standard format: country code
  followed by digits, with no `+`, spaces or punctuation. A leading `00` is treated as an
  international prefix.
- **FR-006**: The staged phone MUST be the value the wizard validated (the *Normalized* column),
  not the free-text *Mobile Number* column.
- **FR-007**: Add, update and delete MUST all use the same standard format when matching staged
  rows against cards.
- **FR-008**: Pending rows staged before this change MUST be converted to the standard format,
  so they match after release.
- **FR-009**: An update or delete row that matches no card for its partner MUST be reported in the
  sync result as "not found".

**Language handling (issue 2)**

- **FR-010**: The Sync button in the Corporate Member section MUST apply only the partner's pending
  **English** rows. The Delivery Tracking section MUST offer a per-partner **German sync** that
  applies only that partner's pending **German** rows. Both syncs MUST follow the same rules in
  this spec (invitations, phone matching, card moves, row states).
- **FR-011**: A sync MUST mark as synchronized only the rows it actually processed. Rows of a
  language the sync did not handle MUST stay pending.
- **FR-012**: Cards created from German rows MUST be blue (non-paid) cards with numbers in the
  German range. Cards from English rows MUST be corporate (red) cards with numbers in the
  corporate range, as today.
- **FR-012a**: The Corporate Member partner table MUST show English and German pending counts
  separately. The German sync control MUST be disabled for a partner with no pending German rows.
- **FR-012b**: Delivery Tracking's "unsynced" view MUST keep listing German rows until the German
  sync applies them.

**Cross-partner protection (issue 7)**

- **FR-013**: When an add row's phone already belongs to a card of a **different** partner, the
  system MUST move that card to the syncing partner. The move sets the new owner, refreshes the
  details, type and expiry from the row, makes the card active and keeps its card number. The
  card's remarks MUST record the previous partner, the new partner and the date of the move.
- **FR-013a**: Update and delete rows MUST NOT change a card owned by a different partner. Such
  rows MUST be reported as *conflict*.
- **FR-014**: An add whose phone belongs to a card of the **same** partner MUST update and
  reactivate that card, as today.
- **FR-015**: The sync result MUST list every card move (phone, previous partner) and every
  conflict row (phone, owning partner).

**Birthdays (issue 6)**

- **FR-016**: The system MUST accept Date of Birth as an Excel date cell, `DD/MM/YYYY` (with or
  without leading zeros) or `YYYY-MM-DD`, and MUST store it as a year-month-day date.
- **FR-017**: A Date of Birth that cannot be read MUST be stored as empty. The wizard MUST warn
  about the row, and the row MUST NOT be rejected.
- **FR-018**: When a staged update has an empty birthday, the sync MUST keep the card's existing
  birthday.

**Duplicates and superseded rows (issues 3 and 8)**

- **FR-019**: There MUST be at most one pending row per partner and phone. A new upload for the
  same employee MUST replace the pending row, and the replaced row MUST be kept and marked
  superseded.
- **FR-020**: A row identical to the current pending row MUST be counted as unchanged. The
  submission result MUST report new, replaced and unchanged counts that add up to the number of
  rows submitted.
- **FR-021**: Every staged row MUST end in one of these states: *pending*, *synchronized* (applied),
  *superseded* (replaced by a newer row), *not found*, *conflict* or *already active*. Only rows
  that were applied may be marked *synchronized*. The sync result MUST report a count for each
  final state.

**Ageing (issue 9)**

- **FR-022**: Pending rows MUST NOT expire. A row stays pending, counts towards the partner's
  pending updates, and syncs normally no matter how old it is.
- **FR-022a**: The partner table MUST flag a partner as "older than 30 days" when any of its
  pending rows was submitted more than 30 days ago. The flag MUST show the date of the oldest
  pending row, and MUST disappear once no such row is pending.

**General**

- **FR-023**: The whole sync for one partner MUST still succeed or fail as a unit. If it fails,
  no card changes and no state changes are kept.
- **FR-024**: Running Sync twice for the same partner with no new upload MUST change nothing the
  second time.
- **FR-025**: `PARTNER_ONBOARDING_WORKFLOW.md` MUST be updated to describe the corrected
  behaviour, and section 7 MUST record which issues were resolved.

### Key Entities

- **Pending change (staged employee row)**: One employee entry from a partner's uploaded list. It
  holds the partner, employee details, standard-format phone, language, requested action
  (add/update/delete), birthday and submission time. It carries a lifecycle state (FR-021) and,
  once closed, when it was closed and why.
- **Corporate member card**: The live membership. Identified by phone and owned by one partner.
  It has a type (corporate/red or blue) set by language, a card number in that type's range, an
  active flag, an expiry date and remarks recording what changed it.
- **Sync result**: The outcome shown to the admin after an English or German sync. It holds the
  count per outcome (created, updated, moved, deactivated, superseded, not found, conflict, already
  active) and invitations queued, plus a list of card moves and conflict rows.
- **Submission result**: The outcome shown to the partner after upload: new, replaced and
  unchanged counts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of cards created by a sync receive an invitation email (or an error-log entry)
  within 15 minutes for a batch of up to 500 new members.
- **SC-002**: For a test list mixing `+`, spaced, dashed and plain phone formats, 100% of update
  and delete rows whose employee has a card are applied.
- **SC-003**: After any sync, zero rows are marked synchronized without a matching card change.
  An audit query comparing synchronized rows with card changes finds no mismatch.
- **SC-004**: Every card that changes because of another partner's upload has moved to that
  partner, with the move recorded in its remarks and the sync result. Zero cards end up with one
  partner's details while owned by another.
- **SC-005**: At least 99% of submitted birthdays in the three accepted formats appear correctly
  on the resulting cards.
- **SC-006**: Uploading the same list twice leaves the partner's pending count unchanged, and the
  second submission reports every row as unchanged.
- **SC-007**: No pending row disappears from the admin's view without being applied or closed with
  a reported state. Every partner with pending rows older than 30 days shows the flag.
- **SC-009**: After an English sync, 100% of the partner's pending German rows are still pending
  and still visible in Delivery Tracking.
- **SC-008**: Admins no longer need **Resend Invitation** after a normal sync. Its use for that
  purpose drops to zero.

## Assumptions

- The live card phone format (country code and digits, no `+`) stays the standard. 4,317 of the
  existing cards already use it, so cards are not migrated, only staged rows are.
- The wizard's existing checks stay: valid international phone, no duplicate phones within one file.
- The 3-month "already active" guard for adds is kept as it is.
- **Resend Invitation** stays available as a manual fallback. Its behaviour does not change.
- Manual add/edit/delete in the Corporate Members grid is out of scope.
- Admin access control for the sync screens is unchanged.
- **Sync All** remains disabled. This spec covers syncing one partner at a time.
- Partner login (OTP) and wallet pass issuing are unchanged.
- Invitation emails use the existing invitation template. The content does not change.
