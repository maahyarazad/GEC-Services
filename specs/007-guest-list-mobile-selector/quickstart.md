# Quickstart: Validating the Guest List Mobile Selector Modal

**Feature**: `007-guest-list-mobile-selector` | **Date**: 2026-09-07

Contract detail lives in `contracts/ui-contract.md`; state model in `data-model.md`.

> **The single most important instruction in this document**: the reported bug **cannot be
> reproduced or verified in a desktop browser's device emulator**. Chrome DevTools' device mode has
> no URL bar, so `100vh` equals the visible height there and the pagination looks fine. It only
> fails on a real device with real browser chrome (`research.md` R1). **Validate on a real phone.**

---

## Prerequisites

- Backend running (`node server.js`) and reachable from your phone — not `localhost`.
- At least one event that has a guest list with **more than one page** of guests (>25 rows), or the
  pagination arrows will be disabled and prove nothing.
- A real iOS Safari and/or Android Chrome device on the same network.

## Setup

```bash
# Backend, from the repo root
node server.js

# Frontend — bind to the network so a phone can reach it
cd public
npm run dev -- --host
```

Vite prints a Network URL. Ensure `VITE_SERVERURL` points at an address the phone can reach, then
open the Network URL on the device and log in to the dashboard.

Find an event with enough guests:

```bash
node -e "
const db = require('better-sqlite3')('./app.db', { readonly: true });
console.log(db.prepare(\`
  SELECT event_id, COUNT(*) guests FROM event_guest_list
  GROUP BY event_id HAVING guests > 25 ORDER BY guests DESC LIMIT 5\`).all());
"
```

---

## Scenario 0 — Reproduce the bug first (do this before implementing)

On a **real phone**, open WhatsApp Broadcast → **Guest List**, select an event with >25 guests.

**Expected (current, broken)**: the pagination bar at the bottom of the grid is cut off or entirely
below the visible area, and the panel does not scroll to reveal it.

If you cannot reproduce this, stop — you are probably in an emulator, or on a device whose browser
chrome auto-hides. Capture a screenshot for comparison with Scenario 1.

---

## Scenario 1 — Pagination is reachable on mobile (spec US1)

Same device, after implementation.

1. Open Guest List, select an event with >25 guests.

**Expected**:
- The pagination bar — page arrows and the "1–25 of N" label — is fully visible without scrolling
  or zooming.
- Tapping the next-page arrow advances the grid, and the bar stays fully visible.
- Compare against the Scenario 0 screenshot.

**Also check both orientations**, and on iOS both with the URL bar expanded (immediately after
load) and collapsed (after a scroll gesture) — the expanded state is the worst case.

## Scenario 2 — The mobile selector modal (spec US2)

1. **Expected**: a single-line compact control shows the selected event's title (or
   "Select an event"), in place of the old inline list.
2. Tap it → **Expected**: a dialog opens titled "Select Event" containing the searchable list.
3. Type in the search box → **Expected**: filters exactly as the old inline list did.
4. Tap an event → **Expected**: the dialog closes, the loading spinner shows, and that event's
   guest list loads.
5. Reopen it and dismiss via backdrop, Esc, and Cancel → **Expected**: each dismissal leaves the
   selection and the loaded guest list unchanged (FR-005).
6. Reopen and tap the **already-selected** event → **Expected**: the dialog closes; no visible
   reload and no second network request (check the Network tab if tethered for remote debugging).

## Scenario 3 — Long event titles

Select (or temporarily rename) an event with a very long title.

**Expected**: the compact trigger truncates with an ellipsis on one line. It must not wrap onto a
second line — that would eat back the vertical space this feature exists to reclaim.

## Scenario 4 — Desktop is unchanged (spec US1 #3, SC-003)

On a desktop browser at ≥900px, open Guest List.

**Expected**: the event list is inline in the left column exactly as before. No trigger button, no
dialog mounted. Visually diff against `main` if unsure.

## Scenario 5 — Crossing the breakpoint

1. On desktop, narrow the window below 900px → **Expected**: the layout stacks and the selector
   becomes the compact trigger.
2. Open the modal, then widen the window past 900px **while it is open** → **Expected**: the dialog
   closes/unmounts rather than floating over the desktop layout, and the selected event is retained
   (spec Edge Cases).
3. Rotate the phone with an event selected → **Expected**: selection and guest list survive.

## Scenario 6 — No event selected

Open Guest List without selecting an event (or after a fresh load).

**Expected**: the trigger reads "Select an event" and is tappable; the grid area shows the existing
"No event selected." placeholder; no crash and no spinner stuck on.

## Scenario 7 — The panel's other features still work (FR-008)

With an event selected on mobile, confirm none of this regressed:

- The "Attendance Progress: X / Y" chip shows and updates.
- Marking a guest attended works.
- Removing a guest works.
- The notepad modal opens, saves, and closes.
- The QR viewer opens and displays a code.

These share the panel and its per-event state wipe (`data-model.md`), so a mistake in the modal
wiring is most likely to surface here.

---

## If the `100vh` → `100dvh` correction is included

`research.md` R1/R3, `contracts/ui-contract.md` → "Separately scoped".

**Verify the edit actually took effect** — the `.scss` is not compiled, so only the `.css` matters:

```bash
grep -n "100vh\|100dvh" public/src/components/SlideMenu/SlideMenu.css \
                        public/src/components/SlideMenu/SlideMenu.scss
```

Both files should show `100dvh` on the `.slide-menu` rule. If only the `.scss` changed, the fix is
inert.

Then, on a real phone, open **every** slide panel and confirm none is clipped or scrolls oddly:
Contact Book, Guest List, Event List, Event Logs, Delivery Logs, Response Logs, Unsubscribed.

**Expected**: each panel's bottom edge sits at the bottom of the *visible* viewport, above the
browser chrome.

---

## Regression checks

- Other `SlideMenu` panels open and close normally on desktop.
- `EventSearch` has no other consumer (`research.md` R2), so nothing outside Guest List should
  change — confirm with:
  ```bash
  grep -rn "EventSearch" public/src --include="*.jsx" --include="*.tsx" | grep -v EventDropdownSearch
  ```
  Only `GuestListPanel` should appear.
- `npm run lint` in `public/` shows no *new* errors versus `main` (this repo has pre-existing lint
  errors; compare counts rather than expecting zero).
- `npm run build` in `public/` succeeds.

## Known limitation, not fixed here

On screens under 600px the grid's rows-per-page selector stays hidden (`CustomDataGrid`, MUI `sm`),
so mobile operators page in fixed 25-row steps. That is existing behaviour, not a regression from
this change (`research.md` R6) — but paging 25-at-a-time through a large guest list is slow, and
may be worth its own ticket.
