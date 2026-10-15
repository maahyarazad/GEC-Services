# Feature Specification: Event Template Dropdown (web_events)

**Feature Branch**: `010-event-template-dropdown`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "in the EventSection.jsx where user can Create New Event or modify it in the Create New Event modal add a new drop down and the data in the drop down comes from this table `select * from web_events we`; so use mysql service to fetch the entire table and only view the titles in the drop down and when user select an item from the dropdown the create event automatically gets the event title and description and the date"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pre-fill a new event from a web_events template (Priority: P1)

An admin opens the **Create New Event** modal in the Events section and sees a new dropdown listing the titles of every row in the external `web_events` table. Selecting a title automatically populates the modal's Title, Description, and Event Date & Time fields from that web event, so the admin does not have to retype them.

**Why this priority**: This is the entire feature. Without it there is no value; with it, event creation from an existing web event is a single selection instead of manual copying across systems.

**Independent Test**: With the MySQL database reachable and at least one `web_events` row present, open Create New Event, pick a title from the dropdown, and confirm the three fields fill with that row's values. Fully delivers the feature on its own.

**Acceptance Scenarios**:

1. **Given** the Create New Event modal is open and `web_events` has rows, **When** the admin opens the new dropdown, **Then** it lists every web event by title (titles only).
2. **Given** the dropdown is open, **When** the admin selects a title, **Then** the modal's Title, Description, and Event Date & Time fields are populated from the corresponding `web_events` row.
3. **Given** fields were pre-filled from a selection, **When** the admin edits any field before saving, **Then** the edited values are what get saved (the dropdown only seeds the form; it does not lock the fields).
4. **Given** a template was selected and fields pre-filled, **When** the admin saves, **Then** the event is created through the existing `POST /api/events` flow with the (possibly edited) field values.

---

### User Story 2 - Reuse the dropdown when editing an event (Priority: P3)

The same dropdown is available in the modal's Edit mode, so an admin editing an existing event can re-seed its fields from a `web_events` template.

**Why this priority**: Nice-to-have consistency. The core ask targets Create; Edit reuse is a small extension because the modal is shared.

**Independent Test**: Open an existing event via Edit, select a template from the dropdown, and confirm the fields update to the template's values.

**Acceptance Scenarios**:

1. **Given** the modal is open in Edit mode, **When** the admin selects a template, **Then** Title, Description, and Event Date & Time are overwritten with the template's values while the event `id` is preserved for the update.

---

### Edge Cases

- **MySQL unreachable / query error**: the modal still opens and remains fully usable for manual entry; the dropdown shows an unobtrusive error/empty state rather than blocking the form or crashing.
- **Empty `web_events` table**: the dropdown renders with no options and a "no templates" indication; manual entry is unaffected.
- **Null/empty description or date on a web event**: the corresponding field is populated with an empty value (not the string "null"); required-field validation still applies on save.
- **Date format mismatch**: `web_events` dates are normalised to the `datetime-local` format (`YYYY-MM-DDTHH:mm`) the modal expects; an unparseable date leaves the date field empty.
- **Large table**: fetching "the entire table" must not visibly stall the modal; the list shows titles only and the payload is limited to the fields the form needs.
- **Duplicate titles**: two web events with the same title remain independently selectable (selection is keyed by the row's unique id, not the title text).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST expose an admin-guarded, read-only endpoint that returns the `web_events` rows from the external MySQL database via the existing MySQL service (`services/mysqlService.js` → `getPool()`).
- **FR-002**: The endpoint MUST return, per row, at least a unique identifier and the fields needed to seed the form: title, description, and event date.
- **FR-003**: The Create New Event modal MUST render a new dropdown whose visible options are the `web_events` **titles only**.
- **FR-004**: Selecting a dropdown option MUST populate the modal's Title, Description, and Event Date & Time fields from the selected `web_events` row.
- **FR-005**: Pre-filled fields MUST remain editable; the dropdown seeds values only and does not disable or lock the fields.
- **FR-006**: Saving MUST continue to use the existing `POST /api/events` (create) and `PUT /api/events` (edit) flows unchanged; this feature does not alter how events are persisted.
- **FR-007**: A failure to load templates (MySQL error, empty result) MUST NOT block manual event creation; the modal stays usable.
- **FR-008**: The endpoint MUST be reachable only by authenticated admins, consistent with every other `/api/*` endpoint.
- **FR-009**: Dates sourced from `web_events` MUST be normalised to the `datetime-local` value format the modal's date field uses.
- **FR-010**: The feature MUST NOT write to, modify, or delete any row in the external `web_events` table (read-only).

### Key Entities *(include if feature involves data)*

- **Web Event (`web_events`)**: a row in the external MySQL database representing a website event. Relevant attributes for this feature: a unique identifier, a title (shown in the dropdown), a description, and an event date. [NEEDS CLARIFICATION: exact column names for id/title/description/date in `web_events` — resolved in research.md with a documented default mapping.]
- **Event (local `events`)**: the existing SQLite-backed admin event created/edited by the modal. Unchanged by this feature except that its Title/Description/Event Date fields can be seeded from a Web Event.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can create a new event pre-filled from a `web_events` template in a single dropdown selection (no manual copy/paste of title, description, or date).
- **SC-002**: Opening the dropdown lists 100% of `web_events` rows by title.
- **SC-003**: After selecting a template, the three fields match the selected row's values (date in the field's expected format) in 100% of cases.
- **SC-004**: When MySQL is unavailable, the modal still opens and a manual event can be created successfully (0 blocking failures).

## Assumptions

- The external MySQL database that `services/mysqlService.js` connects to contains the `web_events` table and is reachable from the app server.
- The admin session model is the existing one: the new endpoint is mounted under `/api/` and inherits the admin-only chokepoint.
- "The entire table" means all rows are available for selection; only the columns needed to seed the form are returned to the browser.
- The local `events` table and its create/edit API remain the system of record for admin events; `web_events` is only a template source.
- Exact `web_events` column names are confirmed during planning; a default mapping (title/description/date) is documented and easy to adjust.
