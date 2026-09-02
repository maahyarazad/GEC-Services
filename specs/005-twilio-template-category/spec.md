# Feature Specification: Selectable WhatsApp Template Category (Marketing / Utility)

**Feature Branch**: `005-twilio-template-category`

**Created**: 2026-08-31

**Status**: Draft — reverse-engineered from `plan.md`

**Input**: User description: "upgrade the CreateTwilioTemplate and the corresponding end point to handle both marketing and utility"

> **Provenance note**: this specification was written **after** `plan.md`, to unblock
> `/speckit-tasks` (whose setup script requires a `spec.md`). Its content is derived
> from the user description plus the codebase findings in `research.md`, not from a
> separate requirements conversation. Treat the priorities and success criteria
> below as proposals to confirm, not as agreed scope.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit a transactional template as Utility (Priority: P1)

An administrator is creating a WhatsApp template that delivers a QR-code ticket to
someone who has already registered for an event. This is a transactional message
about something the recipient already did, not a promotion. Today the system
submits it to WhatsApp as **Marketing** with no way to say otherwise. The
administrator wants to mark it **Utility**, so it is reviewed under the correct
rules and billed at the correct rate.

**Why this priority**: This is the entire feature. Every template the application
has ever created was submitted as Marketing, which mislabels the transactional ones
and overpays for them. An administrator who can only do this — pick a category and
have it honoured — already gets all of the value.

**Independent Test**: Open the Create Twilio Template panel, select **Utility**,
create a text template, and confirm in the Twilio Console that the template's
WhatsApp approval request was submitted under the Utility category. Delivers value
on its own with nothing else built.

**Acceptance Scenarios**:

1. **Given** an administrator has the Create Twilio Template panel open, **When**
   they view the form, **Then** a Category control is visible with **Marketing**
   pre-selected.
2. **Given** the administrator has selected **Utility** and filled in a valid name
   and body, **When** they submit, **Then** the template is created and its
   WhatsApp approval request is submitted under the Utility category.
3. **Given** the administrator leaves the category untouched, **When** they submit,
   **Then** the template is submitted as Marketing — identical to the behaviour
   before this feature.
4. **Given** a template was just created successfully, **When** the administrator
   reopens the panel, **Then** the Category control has returned to **Marketing**.

---

### User Story 2 - Be told the category the template was actually accepted under (Priority: P2)

Meta reviews the message body and may approve a template under a **different**
category than the one requested — typically moving a promotional body submitted as
Utility back to Marketing. An administrator who is told only "created successfully"
has no idea this happened, and will believe a template is Utility (and cheap) when
it is not.

**Why this priority**: Without it the feature still works — the correct category is
submitted — but the administrator is given a false impression whenever Meta
disagrees. It is a correctness-of-reporting slice on top of a working P1, not a
prerequisite for it.

**Independent Test**: Create a template with an obviously promotional body while
selecting Utility, and confirm the confirmation message names the category the
system was actually given back, matching what the Twilio Console shows — rather
than echoing the administrator's choice.

**Acceptance Scenarios**:

1. **Given** a template was submitted as Utility and accepted as Utility, **When**
   the confirmation appears, **Then** it names Utility.
2. **Given** a template was submitted as Utility but re-categorised to Marketing,
   **When** the confirmation appears, **Then** it names Marketing, matching the
   Twilio Console.
3. **Given** the response carries no category at all, **When** the confirmation
   appears, **Then** it falls back to the requested category and still confirms
   success rather than erroring.

---

### User Story 3 - Understand which category to choose (Priority: P3)

An administrator who has never dealt with WhatsApp template policy cannot be
expected to know that an event invitation is Marketing while an event ticket is
Utility. Choosing wrongly wastes days of review turnaround.

**Why this priority**: Pure usability. The feature is complete and correct without
it; this reduces how often an administrator picks wrongly and has to delete and
recreate a template.

**Independent Test**: Switch the Category control between its two options and
confirm that a short, plain-language description of the selected category appears
and changes, with concrete examples drawn from this application's own use cases.

**Acceptance Scenarios**:

1. **Given** Marketing is selected, **When** the administrator reads the form,
   **Then** guidance describes promotional messages and names an example such as an
   event invitation.
2. **Given** the administrator switches to Utility, **When** the guidance updates,
   **Then** it describes transactional messages and names an example such as a
   registration confirmation or a ticket for an existing booking.

---

### Edge Cases

- **What happens when a request carries no category at all?** It is treated as
  Marketing. Existing callers must be unaffected.
- **What happens when a request carries an unrecognised category?** It is rejected
  before anything is created, so no orphaned template is left behind at Twilio.
- **What happens when someone sends `AUTHENTICATION`?** It is rejected. It is a real
  WhatsApp category, but it requires an authentication-style template body this form
  cannot produce, so accepting it would guarantee a downstream rejection.
- **What happens when the category is sent in the wrong case (`utility`)?** It is
  rejected rather than silently corrected — the form always sends the canonical
  value, so a differing value indicates a caller that has not been updated.
- **What happens when the template is created but the approval submission fails?**
  Unchanged from today: the creation still reports success and carries the approval
  error, so the administrator knows the template exists but is not submitted.
- **Can the category be changed after submission?** No. It can only be corrected by
  deleting the template and recreating it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Administrators MUST be able to choose between exactly two categories —
  Marketing and Utility — when creating a WhatsApp template.
- **FR-002**: The system MUST default the category to Marketing, both in the form's
  initial state and when a request omits the category entirely.
- **FR-003**: The system MUST submit the chosen category to WhatsApp in place of the
  currently hardcoded Marketing value.
- **FR-004**: The system MUST reject any category outside the two supported values,
  with a message naming the offending value and the accepted ones.
- **FR-005**: The system MUST perform that rejection before creating anything, so a
  rejected request leaves no template behind.
- **FR-006**: The system MUST validate the category on the server, independently of
  any check the browser performs.
- **FR-007**: A request that does not mention a category MUST behave exactly as it
  did before this feature.
- **FR-008**: The system MUST report back the category the template was actually
  accepted under, falling back to the requested one only when none is returned.
- **FR-009**: The system MUST NOT make the category a reason the create action is
  unavailable — a category is always selected.
- **FR-010**: The system MUST NOT attempt to judge whether the message body matches
  the chosen category.
- **FR-011**: The form MUST show a short description of the selected category.
- **FR-012**: The category MUST be independent of the template type — any supported
  type can be submitted under either category.

### Key Entities

- **Template Category**: The classification WhatsApp applies to a message template,
  determining its review rules and billing rate. Two supported values, Marketing and
  Utility. It is a property of the template's approval request, not of the message
  content and not of any send record — so it is stored at Twilio, never locally.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can create a Utility template end to end without
  leaving the Create Twilio Template panel and without any code or console change.
- **SC-002**: 100% of requests that omit a category continue to produce a Marketing
  template — zero behavioural change for existing callers.
- **SC-003**: 100% of requests carrying an unsupported category are rejected, and
  zero templates are created at Twilio as a result of them.
- **SC-004**: The category named in the success confirmation matches what the Twilio
  Console shows for that template in every case, including re-categorisation.
- **SC-005**: Transactional templates (ticket delivery, registration confirmation)
  can be billed at the Utility rate rather than the Marketing rate, which is a
  reduction on every such conversation.
- **SC-006**: An administrator unfamiliar with WhatsApp policy can pick the right
  category using only what the form tells them.

## Assumptions

- The two categories named in the user description — Marketing and Utility — are the
  complete scope. Authentication is deliberately excluded (see Edge Cases).
- Marketing is the correct default, because it preserves existing behaviour exactly
  and because this application's built-in template defaults are event invitations.
- Meta remains the final authority on a template's category; the system's job is to
  request accurately and report honestly, not to guarantee an outcome.
- Existing WhatsApp approval and delete behaviour, and the existing admin
  authorisation on the endpoint, are reused unchanged.
- Surfacing the category as a column in the template grid is a follow-up, not part
  of this feature — the data already reaches the browser today.
- No categorisation data needs to be stored in the application's own database,
  because nothing in the application reads it.
