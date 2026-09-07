# Feature Specification: Guest List Mobile Selector Modal

**Feature Branch**: `007-guest-list-mobile-selector`

**Created**: 2026-09-07

**Status**: Draft — written during `/speckit-plan` from the user description + codebase research

**Input**: User description: "in Guest List section - in the mobile view the bottom pagination is not reachable in the real devices - use a modal to select the guest list which is now takes small portion of the screen in the top - it is only in mobile"

> **Provenance note**: written during `/speckit-plan`; there was no prior `/speckit-specify`
> conversation. Priorities and success criteria are proposals to confirm.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reach the guest list pagination on a phone (Priority: P1)

An operator opens the Guest List panel on a real phone at an event. The guest grid shows the first
page of guests. They need to reach page 2. Today the pagination bar sits below the visible area and
nothing scrolls, so they cannot. After this change the event selector no longer occupies the top of
the screen, the grid sits higher, and the pagination bar is fully visible and tappable.

**Why this priority**: This is the reported defect. An operator checking guests in at a venue
cannot see past the first 25 guests — the feature is unusable on the device it is used on.

**Acceptance scenarios**:

1. **Given** an operator on a phone with an event selected, **When** the Guest List panel opens,
   **Then** the pagination bar (page arrows and the "1–25 of N" label) is fully visible without
   scrolling and without zooming out.
2. **Given** the pagination bar is visible, **When** the operator taps the next-page arrow,
   **Then** the grid advances and the pagination bar remains fully visible.
3. **Given** an operator on a desktop browser, **When** they open the Guest List panel,
   **Then** the layout is unchanged from today — the event list still sits in the left column.

---

### User Story 2 - Choose which event's guest list to view, on mobile (Priority: P1)

On mobile the event selector is no longer a permanent panel at the top. Instead a compact control
shows the currently selected event; tapping it opens a modal containing the same searchable event
list. Picking an event closes the modal and loads that event's guest list.

**Why this priority**: Same priority as US1 because it is the *mechanism* by which US1 is achieved —
the top strip has to go somewhere. Shipping US1 without it would mean removing event selection from
mobile entirely.

**Acceptance scenarios**:

1. **Given** an operator on a phone, **When** the Guest List panel opens, **Then** a compact
   control shows the selected event's title, or a "Select an event" prompt when none is selected.
2. **Given** the compact control, **When** the operator taps it, **Then** a modal opens containing
   the searchable event list.
3. **Given** the modal is open, **When** the operator types in the search box, **Then** the list
   filters exactly as the current inline list does.
4. **Given** the modal is open, **When** the operator taps an event, **Then** the modal closes and
   that event's guest list loads, showing the loading indicator during the fetch.
5. **Given** the modal is open, **When** the operator dismisses it without choosing,
   **Then** the previously selected event and its guest list are unchanged.

---

### Edge Cases

- **No event selected**: the compact control must still be tappable, and the grid area shows the
  existing "No event selected." placeholder.
- **Rotation / resize across the breakpoint**: switching between mobile and desktop layout must not
  lose the selected event or leave the modal orphaned on desktop.
- **Selecting the already-selected event**: must not trigger a redundant refetch or leave the modal
  open.
- **Event switch while the modal is open**: the existing per-event state wipe in `GuestListPanel`
  must still run, and the modal must close.
- **Long event titles** in the compact control must truncate, not wrap the layout.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On mobile, the always-visible event list at the top of the Guest List panel MUST be
  replaced by a compact trigger control plus a modal.
- **FR-002**: On desktop, the layout MUST remain exactly as it is today (event list in a fixed
  left column beside the grid).
- **FR-003**: The modal MUST contain the same searchable, filterable event list as today, with
  identical selection behaviour.
- **FR-004**: Selecting an event MUST close the modal and load that event's guest list through the
  existing selection path — no change to how the guest list is fetched or stored.
- **FR-005**: Dismissing the modal without a selection MUST leave the current selection unchanged.
- **FR-006**: The grid's pagination bar MUST be fully visible and interactive on mobile without
  page scrolling.
- **FR-007**: The compact trigger MUST show the selected event's title, truncated if long, or a
  clear prompt when nothing is selected.
- **FR-008**: The change MUST NOT alter guest-list data, the attendance flow, QR handling, or the
  notepad.
- **FR-009**: A single, explicitly chosen breakpoint MUST govern "mobile" for this panel
  (see `research.md` R5 — three conflicting thresholds exist today).

### Key Entities

None. This feature adds no persisted data and changes no API. The only new state is local UI state
(modal open/closed) — see `data-model.md`.

## Success Criteria *(mandatory)*

- **SC-001**: On a real phone, an operator can reach and tap the pagination controls in the Guest
  List panel without scrolling or zooming.
- **SC-002**: An operator can change the selected event on mobile in at most 3 taps
  (trigger → optionally search → event).
- **SC-003**: The desktop Guest List layout is visually unchanged.
- **SC-004**: Vertical space available to the grid on mobile increases by roughly 20% of the
  viewport height (the space the inline event list occupies today).
- **SC-005**: No change to the number or shape of network requests made when selecting an event.

## Assumptions

- "Select the guest list" means selecting the **event** whose guest list is shown — that is what the
  top control does today (`EventSearch`), and each event has one guest list.
- The modal follows the existing `Dialog maxWidth="sm" fullWidth` pattern used by `NotepadModal`
  and the QR viewer, rather than introducing a full-screen dialog (never used in this codebase).
- Mobile is defined as the MUI `md` breakpoint (<900px), matching the `xs`/`md` switch
  `GuestListPanel` already uses for this exact layout. Confirm if you intended <768px.

## Out of Scope

- Any change to desktop layout.
- Changes to other `SlideMenu` panels (Contact Book, Event List, logs), except as noted below.
- Guest list data, attendance, QR, or notepad behaviour.

## Related Defect (recommended, separately scoped)

`research.md` R1 identifies the underlying cause: `.slide-menu` is sized with `height: 100vh`, the
*static* viewport height, which on mobile browsers is taller than the visible area — so the bottom
strip of every slide panel renders behind the browser chrome, and because the inner content is
sized in fixed `dvh` units it never overflows, so nothing scrolls.

Reclaiming ~20dvh (this feature) is enough to bring the Guest List pagination back into view, but
the defect remains latent for every other panel. A one-line `100vh` → `100dvh` change fixes the
cause. It is tracked separately in this plan because it touches a shared stylesheet used by all
panels, and that is the user's call to accept or defer.
