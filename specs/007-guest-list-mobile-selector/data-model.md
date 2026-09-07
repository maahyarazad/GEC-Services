# Phase 1 Data Model: Guest List Mobile Selector Modal

**Feature**: `007-guest-list-mobile-selector` | **Date**: 2026-09-07

**This feature introduces no persisted entities, no schema change, and no API change.** It is a
presentational change to where an existing control is rendered. This document therefore describes
the **state model** the feature touches, and — as importantly — what it must leave alone.

---

## New state

Exactly one addition, local to `GuestListPanel`:

| State | Type | Owner | Purpose |
|---|---|---|---|
| `eventModalOpen` | `boolean` | `GuestListPanel` (`useState`) | Whether the mobile event-selection modal is open. Defaults to `false`. |

Plus one derived value, not stored:

| Derived | Source | Purpose |
|---|---|---|
| `isMobile` | `useMediaQuery(theme.breakpoints.down('md'))` | Chooses inline vs modal rendering (`research.md` R4) |

Neither belongs in redux: the modal's open state is meaningless outside this panel, is not shared,
and must not survive a remount. This matches how `notepadOpen` and `qrViewOpen` are already handled
in the same component.

---

## Existing state this feature reads but MUST NOT change

The event selection and guest list already live in the redux `eventSlice`, and every one of these
is written by `EventSearch` or by `GuestListPanel`'s existing effects. Moving `EventSearch` into a
modal must not alter any of it.

| Selector / action | Where it lives | Role |
|---|---|---|
| `getSelectedEvent` | `features/eventSlice` | The chosen event; drives the guest-list fetch and the per-event state wipe |
| `setSelectedEvent` | `features/eventSlice` | Dispatched by `EventSearch` on selection |
| `getSelectedGuestList` / `setSelectedGuestList` | `features/eventSlice` | The fetched guest rows shown in the grid |
| `getGuestListLoading` / `setGuestListLoading` | `features/eventSlice` | Drives the grid's loading spinner and unmount-on-switch |
| `getGuestListRefetchNonce` | `features/eventSlice` | Triggers a refetch of the current event's list |
| `getEvents` | `features/eventSlice` | The list of events to choose from |

**Invariant**: `EventSearch` is moved, not modified in its selection or fetch behaviour. Its
`AbortController` handling, the refetch-nonce effect, and all dispatches stay exactly as they are.
The only permitted change is making its internal list height configurable for the modal context
(`research.md` R2).

---

## Component-local state that must keep working

`GuestListPanel` wipes all of the following whenever `eid` changes
(`GuestListPanel.jsx:64-79`). Selecting an event *from inside the modal* must still trigger that
wipe, because it is keyed on the redux event id — not on where the click happened.

`activeMemberPhones`, `clubtimeHistory`, `guestNotes`, `guestQrCodes`, `guestQrGenerated`,
`notepadOpen`, `notepadContactId`, `notepadContactName`, `qrViewOpen`, `qrViewLoading`, `qrViewUrl`
(plus `objectUrlRef` revocation).

**Consequence for the design**: because the wipe is driven by the redux `eid` and not by the
selector's location, moving `EventSearch` into a modal cannot break it. This is a reason to reuse
the component rather than reimplement selection.

---

## State transitions

```text
                    ┌──────────────────────────────┐
                    │  eventModalOpen = false      │  ← initial, and on desktop always
                    │  (compact trigger visible)   │
                    └──────────────┬───────────────┘
                                   │ operator taps the trigger  (mobile only)
                                   ▼
                    ┌──────────────────────────────┐
                    │  eventModalOpen = true        │
                    │  (EventSearch inside Dialog)  │
                    └───┬──────────────────────┬───┘
     dismiss (backdrop, │                      │ operator taps an event
     Esc, Cancel)       │                      │
                        ▼                      ▼
        selection unchanged        EventSearch dispatches setSelectedEvent
        eventModalOpen = false     → guest list fetch → eid changes
                                   → per-event state wipe runs
                                   → eventModalOpen = false
```

**Rules**:

- Dismissing without choosing MUST leave the redux selection untouched (FR-005). Since dismissal
  only flips local state, this holds by construction.
- Selecting the already-selected event MUST close the modal without a redundant refetch
  (spec Edge Cases).
- Crossing the breakpoint to desktop MUST force `eventModalOpen` to `false`, so the dialog cannot
  be left orphaned over the desktop layout (spec Edge Cases).

---

## Rendering contract by viewport

| Viewport | Selector rendering | Grid vertical budget |
|---|---|---|
| ≥900px (desktop) | `EventSearch` inline in a 280px left column — **unchanged** | unchanged (`85dvh`) |
| <900px (mobile) | Compact trigger in the flow; `EventSearch` inside a `Dialog` | ≈20dvh reclaimed (`research.md` R1) |

The desktop branch must render the identical element tree it renders today, so that FR-002 / SC-003
hold by construction rather than by visual inspection.
