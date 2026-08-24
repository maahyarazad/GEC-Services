# Feature Specification: WhatsApp Opt-Out Tracking Webhook

**Feature Branch**: `003-twilio-optout-webhook`

**Created**: 2026-08-24

**Status**: Draft

**Input**: User description: "Twilio does not expose an API or report for opted-out WhatsApp numbers, so we need a webhook that captures inbound opt-out keywords (STOP, UNSUBSCRIBE, CANCEL, etc.) sent to our WhatsApp Messaging Service, stores the opted-out number (upsert, idempotent) in our own database, and lets outbound send logic check this store to skip already-opted-out numbers as a backstop to Twilio's native STOP/21610 handling. Non-goals: replacing Twilio's native STOP handling, building an opt-in (START) flow, handling non-WhatsApp channels." Extended with: "Add an opt-out list section to the admin dashboard's WhatsApp Broadcast tab (admin?tab=whatsapp-broadcast), so staff can see who has opted out without querying the database directly."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture an opt-out the moment it happens (Priority: P1)

A recipient who no longer wants to receive WhatsApp messages replies to our Messaging Service with an opt-out keyword (e.g. "STOP", "UNSUBSCRIBE", "CANCEL"). The system recognizes the keyword and records that number as opted-out in our own database, independent of whatever Twilio does internally.

**Why this priority**: This is the core problem the feature exists to solve — without it, we have no record of who opted out and cannot honor those requests ourselves. Everything else builds on this capture step.

**Independent Test**: Send an inbound WhatsApp message containing "STOP" from a test number to the Messaging Service webhook. Confirm a new opt-out record appears for that number within a few seconds, with the matched keyword and a timestamp.

**Acceptance Scenarios**:

1. **Given** a number with no prior opt-out record, **When** it sends "STOP" (case-insensitive, allowing surrounding whitespace), **Then** a new opt-out record is created for that number with the matched keyword and timestamp.
2. **Given** a number with no prior opt-out record, **When** it sends an ordinary, non-keyword message, **Then** no opt-out record is created.
3. **Given** a number sends "stop" in lowercase or "  Stop  " with extra spaces, **When** the webhook processes it, **Then** it is still recognized as an opt-out.

---

### User Story 2 - Don't double-count repeat opt-outs (Priority: P2)

A recipient who already opted out sends another opt-out keyword (accidentally or on purpose). The system does not create a duplicate record; it recognizes the number is already opted out and simply keeps the record current.

**Why this priority**: Without idempotency, the opt-out store fills with duplicate rows per number, making it unreliable to query "is this number opted out?" and complicating reporting. This is essential for the store to be trustworthy, but it only matters once capture (US1) already works.

**Independent Test**: Send "STOP" twice in a row from the same test number. Confirm only one opt-out record exists for that number afterward (the record may reflect the latest keyword/timestamp, but the count of records for that number stays at one).

**Acceptance Scenarios**:

1. **Given** a number that already has an opt-out record, **When** it sends another opt-out keyword, **Then** the existing record is updated (not duplicated) and the total record count for that number remains one.
2. **Given** a number that already has an opt-out record, **When** an admin or report queries the opt-out store for that number, **Then** exactly one record is returned.

---

### User Story 3 - Skip known opted-out numbers before sending (Priority: P3)

Before any outbound WhatsApp message is dispatched (broadcast, template send, or individual message), the system checks the opt-out store and skips or flags numbers that are already known to have opted out, as an extra safeguard on top of Twilio's own opt-out enforcement.

**Why this priority**: This closes the loop — capturing opt-outs (US1/US2) is only useful if it changes future sending behavior. It's lower priority than capture because Twilio already blocks sends to opted-out numbers natively (error 21610); this is a backstop and reporting aid, not the only line of defense.

**Independent Test**: Add a test number to the opt-out store directly, then trigger an outbound send (broadcast or single send) that includes that number. Confirm the system skips that number (does not attempt to send) and records/flags it as skipped, while other numbers in the same batch send normally.

**Acceptance Scenarios**:

1. **Given** a number is present in the opt-out store, **When** an outbound send is attempted to a list that includes that number, **Then** the system skips sending to that number and the rest of the list is unaffected.
2. **Given** a number is not present in the opt-out store, **When** an outbound send is attempted, **Then** the system proceeds to send normally.
3. **Given** an outbound send skips one or more opted-out numbers, **When** the send completes, **Then** the caller/report can see which numbers were skipped and why.

---

### User Story 4 - View the opt-out list from the admin dashboard (Priority: P2)

A staff member managing WhatsApp broadcasts opens the WhatsApp Broadcast section of the admin dashboard and finds a dedicated view listing every phone number that has opted out — including the keyword that triggered it and when it happened — without needing direct database access.

**Why this priority**: The opt-out store (US1/US2) and the sending backstop (US3) only benefit staff indirectly today — there's no way for a non-technical admin to see who has opted out, audit the list, or explain to a stakeholder why a particular number was skipped. This closes the loop for day-to-day operational use, but it depends on the store already existing (US1/US2) and is not required for the backend enforcement in US3 to keep working.

**Independent Test**: With one or more numbers already present in the opt-out store, open the WhatsApp Broadcast tab in the admin dashboard and navigate to the opt-out list section. Confirm every opted-out number appears with its matched keyword and opt-out date/time, and that the list updates to include a number that opts out while the admin is using the dashboard (on refresh or next load).

**Acceptance Scenarios**:

1. **Given** the opt-out store contains one or more records, **When** a staff member opens the opt-out list section under WhatsApp Broadcast, **Then** they see each opted-out number, its matched keyword, and the date/time it opted out.
2. **Given** the opt-out store is empty, **When** a staff member opens the opt-out list section, **Then** they see a clear empty state (not an error or a blank screen).
3. **Given** a large number of opt-out records, **When** a staff member opens the section, **Then** the list is paginated or otherwise browsable without becoming unusably slow, consistent with the dashboard's other data tables (e.g. Response Logs, Delivery Logs).
4. **Given** the opt-out list section, **When** a staff member searches or filters by phone number, **Then** only matching records are shown.

---

### Edge Cases

- What happens when the inbound message body contains an opt-out keyword as part of a longer, unrelated sentence (e.g. "please cancel my old ticket")? The system should only match on the message body being (after trimming) exactly one of the configured opt-out keywords, not a substring match, to avoid false positives.
- What happens when the inbound webhook payload is missing the sender number or body entirely? The system should not create an opt-out record and should log the anomaly rather than failing the webhook response.
- What happens if the same number opts out, is later manually removed from the opt-out store (re-permitted), and then opts out again? A new/updated record should be created as normal — there is no separate "opt-out history" requirement in this feature.
- What happens if the opt-out webhook receives a message from a number formatted differently than E.164 (e.g. missing "+")? The system should normalize the number to a consistent format before storing or querying, so lookups aren't missed due to formatting differences.
- What happens when the pre-send check runs against a very large recipient list? The check must not meaningfully slow down the overall send operation (see SC-004).
- What happens when a staff member without WhatsApp Broadcast access tries to reach the opt-out list section? They should be denied the same way they're denied any other admin-only view in this section today — no separate access rule is introduced by this feature.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST receive inbound WhatsApp messages via the existing webhook integration and evaluate each message's body against a configured list of opt-out keywords (at minimum: STOP, UNSUBSCRIBE, CANCEL), matching case-insensitively and ignoring leading/trailing whitespace.
- **FR-002**: System MUST treat only an exact match of the trimmed message body against a configured opt-out keyword as an opt-out event; partial or substring matches within longer messages MUST NOT trigger an opt-out.
- **FR-003**: When an opt-out keyword is matched, System MUST record the sender's phone number, the matched keyword, and a timestamp in a persistent opt-out store.
- **FR-004**: System MUST upsert by phone number — a number that already has an opt-out record MUST NOT produce a second record; repeat opt-outs update the existing record instead.
- **FR-005**: System MUST normalize phone numbers to a consistent format before storing or comparing them, so the same physical number is always recognized as the same record regardless of formatting differences in the inbound payload.
- **FR-006**: System MUST expose a way to query whether a given phone number is currently opted out (used by both outbound send logic and by staff needing to check status on demand).
- **FR-007**: Outbound WhatsApp send logic (broadcasts, template sends, and individual sends) MUST check the opt-out store before dispatching to each recipient and MUST skip recipients found in the store.
- **FR-008**: System MUST record or report which recipients were skipped due to opt-out status as part of an outbound send's results, so the outcome is visible to whoever initiated the send.
- **FR-009**: System MUST NOT alter or interfere with Twilio's own native STOP handling and 21610 error behavior — this store is an additional, independent safeguard, not a replacement.
- **FR-010**: System MUST NOT create any opt-out record for inbound messages that do not match a configured opt-out keyword.
- **FR-011**: System MUST handle malformed or incomplete inbound webhook payloads (missing sender number or body) without creating an opt-out record and without causing the webhook request to fail or time out.
- **FR-012**: The configured opt-out keyword list used by this webhook MUST be reviewable against the keyword list configured in Twilio's Advanced Opt-Out settings, so the two stay in parity.
- **FR-013**: The admin dashboard's WhatsApp Broadcast section MUST provide a dedicated opt-out list view showing every opted-out phone number, its matched keyword, and the date/time it opted out.
- **FR-014**: The opt-out list view MUST show a clear empty state when no numbers have opted out, rather than an error or blank area.
- **FR-015**: The opt-out list view MUST support browsing large result sets (pagination or equivalent) and searching/filtering by phone number, consistent with the dashboard's other WhatsApp data tables.
- **FR-016**: The opt-out list view MUST be reachable only by staff who already have access to the WhatsApp Broadcast section — no new, separate permission is introduced.

### Key Entities

- **Opt-Out Record**: Represents a single WhatsApp phone number that has opted out of receiving messages. Key attributes: phone number (normalized, unique), most recent matched keyword, timestamp of most recent opt-out event. One record per phone number.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An inbound opt-out keyword from a test number results in a queryable opt-out record within 10 seconds of the message being received.
- **SC-002**: Sending the same opt-out keyword repeatedly from one number never results in more than one opt-out record for that number, across 100% of tested repeat attempts.
- **SC-003**: Zero opt-out records are created from non-keyword inbound messages across a representative sample of normal conversational traffic.
- **SC-004**: Checking opt-out status for a recipient list of 1,000 numbers before an outbound send adds no more than 2 seconds to total send preparation time.
- **SC-005**: 100% of outbound sends that include a previously opted-out number skip that number and report it as skipped, verified across test batches.
- **SC-006**: A staff member can find whether a specific number has opted out, and when, in under 30 seconds using the dashboard alone (no database access required).
- **SC-007**: The opt-out list view loads and becomes usable in under 3 seconds for a list of up to 1,000 opted-out numbers.

## Assumptions

- The existing `/webhooks/whatsapp` inbound handler (already storing raw Twilio payloads) is the integration point this feature extends, rather than a separate Twilio Function — no new webhook URL needs to be registered in Twilio.
- The opt-out store lives in our primary application database (not a Twilio Sync List), since the app already has a database and this keeps the store easy to join/query alongside existing contact and send data.
- "Outbound send logic" covers all paths that dispatch WhatsApp messages from this application (broadcast sends, template sends, individual sends) — any of these can originate a message to an opted-out number and all must honor the skip check.
- Building an opt-in (START) flow and handling non-WhatsApp channels are explicitly out of scope for this feature, per the original problem description.
- Twilio's native STOP handling and 21610 error response remain the primary enforcement mechanism; this feature is a backstop for cases where our own records or reporting need to reflect opt-out status independently of Twilio.
- The opt-out list view (US4) is read-only for this feature — removing a number from the opt-out store (re-permitting it) is not included; that would be a manual database action or a future enhancement, kept separate to avoid conflating this with an opt-in flow (a stated non-goal).
- The opt-out list is distinct from the existing manual "blacklist" toggle available on individual contacts elsewhere in the dashboard; this feature does not change or merge with that existing mechanism.
- The opt-out list section lives alongside the WhatsApp Broadcast tab's existing data views (e.g. Response Logs, Delivery Logs) and is reachable by the same staff who already have access to that tab today.
