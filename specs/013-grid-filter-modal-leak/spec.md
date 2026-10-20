# Feature Specification: CustomDataGrid filter panel leaks after container closes

**Feature Branch**: `013-grid-filter-modal-leak`

**Created**: 2026-10-16

**Status**: Draft

**Input**: User description: "the CustomDataGrid component has filter modal, so when the parent component CustomDataGrid use inside a slider, after the slide close meaning the CustomDataGrid is disposed the filter modal still there - fix this"

## Context (why this is happening)

`CustomDataGrid`'s toolbar renders its **Filters** panel through `createPortal(..., document.body)` as a
`position: fixed` surface, and owns the open/close flag (`filterOpen`) as state **local to the toolbar**. The
panel is therefore a child of `<body>`, structurally detached from the grid's own DOM subtree.

The grid is shown inside sliding containers (`SlideMenu`, and the global `SlideModalProvider`). Those containers
**keep their children mounted** and hide them purely with CSS (`transform: translateX(100%)`); several Dashboard
panels keep the grid mounted unconditionally. When such a container closes, nothing instructs the toolbar to drop
`filterOpen`, so the body-level fixed panel keeps painting in the viewport even though the slider (and the grid it
belonged to) has slid off-screen. The user perceives this as "the grid is disposed but its filter modal is still
there."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Filter panel disappears when the slider closes (Priority: P1)

An operator opens a sliding panel that contains a data grid (e.g. WhatsApp → Contact Book, Unsubscribed, Guest
List, Event Logs, Delivery/Response Logs), opens the grid's **Filters** panel, then closes the slider (X button,
backdrop click, or Escape). The floating Filters panel must vanish together with the slider.

**Why this priority**: This is the reported defect. The orphaned panel floats over unrelated screens, blocks
clicks, and looks broken. It is the whole point of the work.

**Independent Test**: Open any grid-bearing slider, open Filters, close the slider, and confirm no filter surface
remains anywhere in the document. Fully testable on its own; delivers the entire fix.

**Acceptance Scenarios**:

1. **Given** a slider containing a `CustomDataGrid` is open and its Filters panel is open, **When** the user
   closes the slider via the close button, **Then** the Filters panel is removed from the screen and from the DOM.
2. **Given** the same state, **When** the user closes the slider by clicking the backdrop, **Then** the Filters
   panel is removed.
3. **Given** the same state, **When** the user presses Escape to close the slider, **Then** the Filters panel is
   removed.
4. **Given** the slider is reopened afterwards, **When** it becomes visible again, **Then** the grid shows with the
   Filters panel closed (no stale panel re-appears).

### User Story 2 - No regression for inline grids (Priority: P2)

A grid rendered directly on a normal page (not inside a slider) must keep its existing filtering behaviour: the
Filters panel opens under the button, stays anchored while the user scrolls the content, and closes on Escape or
the panel's own close button.

**Why this priority**: The fix lives in the shared component used by 12 call sites; it must not degrade the
common, non-slider case.

**Independent Test**: On an inline grid page, open Filters, add/edit a filter, scroll the surrounding content, and
confirm the panel stays usable and closes normally.

**Acceptance Scenarios**:

1. **Given** an inline grid with Filters open, **When** the user scrolls the content a small amount so the toolbar
   stays visible, **Then** the panel remains open and stays anchored to the Filters button.
2. **Given** an inline grid with Filters open, **When** the user edits filter values, **Then** filtering continues
   to work exactly as before.

### Edge Cases

- **Switching between sliders**: opening slider A, opening its Filters, then opening slider B (A unmounts/hides)
  must not leave A's Filters panel behind.
- **Column panel**: the adjacent **Columns** popover (MUI `Popover`) already auto-dismisses; behaviour must stay
  unchanged.
- **Grid fully unmounted** (conditionally rendered panels such as Delivery/Response Logs): closing must still leave
  no orphaned panel (already handled by React unmount; must remain correct).
- **Open MUI Select inside the filter** (column/operator dropdown) must not be misread as the grid leaving the
  viewport and must not auto-close the panel.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Filters panel MUST NOT remain visible once the `CustomDataGrid` instance that owns it is no
  longer visible on screen, regardless of whether the container unmounts the grid or merely hides it via CSS
  transform / `display`.
- **FR-002**: Closing the sliding container by any of its existing affordances (close button, backdrop click,
  Escape) MUST result in the Filters panel being gone.
- **FR-003**: The fix MUST live in the shared grid component so all current and future call sites benefit without
  per-call-site changes.
- **FR-004**: Existing Filters behaviour for inline (non-slider) grids MUST be preserved: open under the button,
  re-anchor on scroll/resize, close on Escape and on the panel's close control.
- **FR-005**: The fix MUST NOT change the grid's public props/API or require consumers (`WhatsApp.jsx`, Sections,
  Dashboard panels) to pass new props.
- **FR-006**: The fix MUST be compatible with the project's React 19 + React Compiler setup (no behaviour that the
  compiler would break; `npm run lint` and `npm run check:compiler` stay green).

### Key Entities *(include if feature involves data)*

- **Filter panel open-state**: a boolean UI state (`filterOpen`) owned by `GridToolbar`, plus the anchor rect used
  to position the portal. No persisted data.
- **Grid visibility**: derived, observable property — whether the toolbar/grid is actually rendered on screen
  (not `display:none`, not translated out of the viewport, not unmounted).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In every grid-bearing slider in the app, closing the slider while Filters is open leaves **zero**
  filter-panel DOM nodes under `<body>` (verifiable via DOM inspection).
- **SC-002**: 100% of the three close paths (button, backdrop, Escape) dismiss the panel.
- **SC-003**: No regression in inline-grid filtering: all existing filter operators and the scroll-reposition
  behaviour continue to work.
- **SC-004**: Zero changes required at the 12 `CustomDataGrid` call sites.
- **SC-005**: `npm run lint` and `npm run check:compiler` pass with the change.

## Assumptions

- The reported "slider" refers to the in-app sliding containers `SlideMenu`
  (`public/src/components/SlideMenu/SlideMenu.jsx`) and the global `SlideModalProvider`
  (`public/src/components/Providers/SlideModalProvider.jsx`), both of which hide content with
  `transform: translateX(100%)` while keeping it mounted.
- There is no automated frontend test harness in this project (scripts are dev/build/lint/preview + React-compiler
  checks), so acceptance is validated manually in the browser plus static lint/compiler checks. Adding a test
  framework is out of scope.
- The fix is a client-side UI behaviour change only; no backend, API, or data-model changes are involved.
- "Filter modal" in the report is the toolbar **Filters** panel (the only hand-rolled `document.body` portal in the
  grid); the **Columns** popover is already well-behaved and is out of scope except for non-regression.
