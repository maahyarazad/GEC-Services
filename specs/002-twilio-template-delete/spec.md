# Feature Specification: Twilio Template Delete & Grid Refresh

**Feature Branch**: `002-twilio-template-delete`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "add the delete twilio template feature as well as the refresh button like Support Center Section in the WhatsApp Broadcast that refresh the main DataGrid which shows the templates - Before deleting any template check the twilio_template_message for that contentSid there should be none if there is no record then allow user to send the delete request to server end point"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Delete a template that was never used (Priority: P1)

An administrator in the WhatsApp Broadcast section sees a template in the template grid that was created by mistake, or is an obsolete draft that was never broadcast to anyone. They activate the delete control on that row, are told the template has no send history and asked to confirm, confirm, and the template is removed from the Twilio content library and disappears from the grid.

**Why this priority**: This is the feature. Without it the delete icon in the grid is decorative and the Twilio content library accumulates junk templates that clutter every template picker in the section.

**Independent Test**: Create a throwaway template via the existing Create Template flow, never broadcast it, then delete it from the grid and confirm it is gone from both the grid and the Twilio console.

**Acceptance Scenarios**:

1. **Given** an administrator viewing the template grid, **When** they activate delete on a template with no rows in `twilio_template_message`, **Then** a confirmation prompt names the template and warns that deletion is permanent.
2. **Given** the confirmation prompt is open, **When** the administrator confirms, **Then** the template is deleted at Twilio, a success message is shown, and the grid no longer lists it.
3. **Given** the confirmation prompt is open, **When** the administrator cancels, **Then** nothing is deleted and the grid is unchanged.

---

### User Story 2 - Be stopped from deleting a template that has been sent (Priority: P1)

An administrator attempts to delete a template that has already been broadcast. The system refuses, explaining that the template has send history and that deleting it would orphan the delivery and response logs which resolve template names through its content SID.

**Why this priority**: Equal first priority to Story 1 — it is the safety half of the same action. `twilio_template_message` holds ~29,850 rows joined into the delivery-log, response-log and insight views; deleting a referenced template silently degrades all of them. Shipping Story 1 without Story 2 would be shipping a data-loss bug.

**Independent Test**: Pick any content SID present in `twilio_template_message`, attempt deletion, and confirm the attempt is refused with the usage count shown and that the template still exists at Twilio.

**Acceptance Scenarios**:

1. **Given** a template with one or more rows in `twilio_template_message`, **When** the administrator activates delete, **Then** deletion is blocked before any confirmation prompt appears and the number of recorded sends is shown.
2. **Given** the usage check cannot be completed, **When** the administrator activates delete, **Then** deletion is blocked and the failure is reported, rather than defaulting to allowing the delete.
3. **Given** a template passed the usage check in the browser, **When** a broadcast records a send for it before the administrator confirms, **Then** the server refuses the delete and reports the template as now in use.

---

### User Story 3 - Refresh the template grid in place (Priority: P2)

An administrator who has just created a template elsewhere, or whose template was approved by WhatsApp since the page loaded, activates a Refresh control above the template grid and sees the list and the approval statuses re-fetched without reloading the dashboard.

**Why this priority**: A convenience that removes full-page reloads, and the natural companion to delete — the grid needs to reflect reality after any mutation. It is P2 because both delete stories deliver value without it.

**Independent Test**: Create or delete a template in another browser tab, activate Refresh, and confirm the grid reflects the change.

**Acceptance Scenarios**:

1. **Given** an administrator viewing the template grid, **When** they activate Refresh, **Then** the template list and the WhatsApp approval statuses are both re-fetched and the grid updates.
2. **Given** a refresh is in progress, **When** the administrator activates Refresh again, **Then** the control is disabled or the request is coalesced so duplicate fetches are not issued.
3. **Given** a refresh fails, **When** the request errors, **Then** the previously loaded rows remain visible and the failure is reported.

---

## Requirements *(mandatory)*

- **FR-001**: The template grid MUST offer a delete control on each row (the control already exists and is currently inert).
- **FR-002**: Before a delete is offered, the system MUST check whether the template's content SID appears in `twilio_template_message`.
- **FR-003**: A template with one or more `twilio_template_message` rows MUST NOT be deletable.
- **FR-004**: The usage check MUST be re-run on the server as part of the delete request; the browser-side check is an affordance only and MUST NOT be the sole gate.
- **FR-005**: Deletion MUST require explicit confirmation naming the template.
- **FR-006**: Deletion MUST remove the template from the Twilio content library.
- **FR-007**: The delete and usage-check endpoints MUST require an authenticated administrator.
- **FR-008**: A failed usage check MUST block deletion (fail closed).
- **FR-009**: The section MUST offer a Refresh control above the template grid, visually consistent with the Support Center's Refresh button.
- **FR-010**: Refresh MUST re-fetch both the template list and the approval statuses.
- **FR-011**: A successful delete MUST update the grid without a full page reload.
- **FR-012**: Delete outcomes MUST be reported to the administrator via the existing snackbar mechanism.
- **FR-013**: Every delete attempt, granted or denied, MUST be logged server-side with the acting administrator and the content SID.

### Key Entities

- **Twilio Content Template**: lives at Twilio, identified by content SID (`HX…`). Not stored locally; the grid is built from a live Twilio list call.
- **Template Send Record** (`twilio_template_message`): one row per message sent from a template. The usage gate counts these by `contentSid`.

## Success Criteria *(mandatory)*

- **SC-001**: An administrator can delete an unused template in under 10 seconds without leaving the section.
- **SC-002**: 100% of delete attempts against templates with send history are refused.
- **SC-003**: No delivery-log, response-log or insight row loses its template name as a result of this feature.
- **SC-004**: The grid reflects a create, approve or delete performed elsewhere within one Refresh activation.

## Assumptions

- "No record" is defined strictly as zero rows in `twilio_template_message` for that content SID, per the user's instruction.
- `contact_book.contentSid` and `contact_book_events.contentSid` also reference templates but are deliberately OUT of the gate for this iteration; see research.md for the risk this carries.
- Deletion is permanent at Twilio; no undo or soft-delete is in scope.
