# Feature Specification: Unsubscribed Contacts Panel

**Feature Branch**: `006-unsubscribe-contacts-list`

**Created**: 2026-09-07

**Status**: Draft — written alongside `plan.md` from the user description + codebase research

**Input**: User description: "add a new button in the WhatsApp Boardcast Section to show the list of people in the unsubscribe_contacts and use a left join to bring their contact details from contact_book table - use the same components from UI which has been used for other sections like contact Book slideModal and CustomDataGrid - add remove function inside unsubscribe new slide modal in the actions so user can delete it from table (that is a hard delete)"

> **Provenance note**: this specification was written during `/speckit-plan` (there was no
> prior `/speckit-specify` conversation). Content is derived from the user description plus
> the codebase findings in `research.md`. Treat priorities and success criteria as proposals
> to confirm, not as separately agreed requirements.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View who has unsubscribed (Priority: P1)

An operator managing WhatsApp broadcasts opens the WhatsApp Broadcast section, clicks a new
**Unsubscribed** button in the "Manage Data" button group, and a slide panel opens showing every
row in `unsubscribe_contacts`. Each row shows the phone number and, when that phone matches a
`contact_book` record, the person's name, title, gender, language, type and club/partner name.
Rows with no matching contact still appear, with the contact columns blank.

**Why this priority**: This is the core of the request — today the unsubscribe list is invisible
in the UI and can only be read from SQLite directly. Delivered alone, it is already useful.

**Acceptance scenarios**:

1. **Given** the operator is in the WhatsApp Broadcast section, **When** they click the
   **Unsubscribed** button, **Then** a slide panel titled "Unsubscribed Contacts" opens containing
   a data grid of unsubscribe records.
2. **Given** an unsubscribed phone that exists in `contact_book`, **When** the panel loads,
   **Then** that row shows the contact's first name, last name and type.
3. **Given** an unsubscribed phone with no `contact_book` match, **When** the panel loads,
   **Then** the row is still listed, with the contact columns empty and no error.
4. **Given** the panel is open, **When** the operator sorts, filters or pages the grid,
   **Then** the grid responds using the same server-side behaviour as the Contact Book grid.

---

### User Story 2 - Remove someone from the unsubscribe list (Priority: P2)

From the actions column of the unsubscribed grid, the operator clicks a delete icon on a row,
confirms in the standard confirmation dialog, and the row is permanently removed from
`unsubscribe_contacts`. That phone number becomes eligible for broadcasts again.

**Why this priority**: Depends on User Story 1 existing. It is the corrective path for someone
who unsubscribed by mistake or asked to be re-added.

**Acceptance scenarios**:

1. **Given** the unsubscribed grid is open, **When** the operator clicks the delete icon on a row,
   **Then** a confirmation dialog appears warning the action cannot be undone.
2. **Given** the confirmation dialog is shown, **When** the operator confirms,
   **Then** the row is hard-deleted from `unsubscribe_contacts`, the grid refreshes without it,
   and a success message is shown.
3. **Given** the confirmation dialog is shown, **When** the operator cancels,
   **Then** nothing is deleted.
4. **Given** a phone was removed from `unsubscribe_contacts`, **When** the next broadcast runs,
   **Then** that phone is no longer excluded by the `NOT IN (SELECT uc.phone ...)` filter.

---

### Edge Cases

- An unsubscribe row whose phone matches **no** contact — must render, not be dropped
  (this is why the join is a LEFT JOIN and not an INNER JOIN).
- `unsubscribe_contacts.phone` is stored as an INTEGER without the leading `+`
  (see `research.md` R1); display must not imply the stored value is E.164 text.
- Deleting a row that another operator already deleted — must report "not found", not crash.
- An empty `unsubscribe_contacts` table — the grid shows an empty state, not an error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The WhatsApp Broadcast "Manage Data" button group MUST include a new button that
  opens an Unsubscribed Contacts panel.
- **FR-002**: The panel MUST list every row of `unsubscribe_contacts`, LEFT JOINed to
  `contact_book` on phone, so unmatched unsubscribes are still listed.
- **FR-003**: The grid MUST reuse `CustomDataGrid` and the existing `SlideMenu` panel pattern
  used by the Contact Book, not a new bespoke table or modal.
- **FR-004**: The grid MUST support server-side pagination, sorting and filtering consistent with
  the Contact Book grid.
- **FR-005**: Each row MUST expose a delete action in an actions column.
- **FR-006**: Deleting MUST require confirmation through the existing `openDialog` alert provider.
- **FR-007**: Confirmed deletion MUST hard-delete the row from `unsubscribe_contacts`
  (no soft-delete flag, no archive).
- **FR-008**: Deletion MUST NOT modify or delete the joined `contact_book` record.
- **FR-009**: The row identity used for deletion MUST be `unsubscribe_contacts.id`, never
  `contact_book.id`.
- **FR-010**: The API MUST return 404 when the target unsubscribe row does not exist.

### Key Entities

- **unsubscribe_contacts**: the authoritative opt-out list. `id`, `phone` (INTEGER, UNIQUE),
  `created_at`. Written by the WhatsApp auto-response handler when a recipient taps UNSUBSCRIBE.
- **contact_book**: the person record the unsubscribe row is enriched from. Joined, never mutated
  by this feature.

See `data-model.md` for field-level detail.

## Success Criteria *(mandatory)*

- **SC-001**: An operator can see the full unsubscribe list from the UI without opening SQLite.
- **SC-002**: Unsubscribe rows with no matching contact are visible rather than silently missing.
- **SC-003**: An operator can reverse an unsubscribe in under 15 seconds, in at most 3 clicks
  (button → delete icon → confirm).
- **SC-004**: After a delete, the phone is included in the next broadcast audience.
- **SC-005**: The panel opens and renders the first page within the same time budget as the
  existing Contact Book panel on a comparable dataset.

## Assumptions

- The button belongs in the "Manage Data" group alongside Contact Book / Guest List / Event List,
  since it manages a data list rather than a log. (Confirm if it belongs under "Logs" instead.)
- The panel is a `SlideMenu` (the pattern the Contact Book actually uses) rather than the
  `SlideModalProvider` slide modal, which in this codebase is only used by `SurveyDataGrid`.
- Access control matches the surrounding contact routes, which currently rely on the same
  session/credentials posture as `/api/contacts` (see `research.md` R6 — flagged as an open risk,
  not a decision).
- No re-subscribe audit trail is required; the delete is unconditional and unlogged beyond
  existing error logging.

## Out of Scope

- Manually **adding** a phone to the unsubscribe list from the UI.
- Bulk / multi-select delete.
- Editing the joined contact from this panel.
- Normalising the historical `phone` storage format in `unsubscribe_contacts` (see `research.md`
  R1 — recommended as a separate follow-up, deliberately not bundled here).
