---
description: "Task list for the Guest List Mobile Selector Modal"
---

# Tasks: Guest List Mobile Selector Modal

**Input**: Design documents from `/specs/007-guest-list-mobile-selector/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/ui-contract.md`, `quickstart.md`

**Tests**: **No automated test tasks.** The spec does not request TDD and no test framework is
configured — `public/package.json` has only `vite` / `vite build` / `eslint`, and there is no
`tests/` directory. Validation is the scenario suite in `quickstart.md`.

**⚠️ Validation requires a real phone.** This bug cannot be reproduced or verified in a desktop
browser's device emulator: DevTools device mode has no URL bar, so `100vh` equals the visible
height there and the pagination looks fine. Every validation task below assumes a physical device
(`research.md` R1).

**Organization**: Tasks are grouped by user story. Note the dependency stated under
"User Story Dependencies" — US1 is the *outcome* of US2's implementation, not a parallel track.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2)

## Path Conventions

React SPA (per `plan.md` → Structure Decision). All paths are repo-relative:

- Components: `public/src/components/`
- Feature components: `public/src/components/Dashboard/WhatsApp/`

---

## Phase 1: Setup

**Purpose**: Settle the two open decisions and capture a "before" baseline. The baseline matters —
without it there is no way to prove the fix worked.

- [X] T001 Confirm the breakpoint recorded as an open question in `specs/007-guest-list-mobile-selector/plan.md`: MUI `md` (<900px, matching the existing `flexDirection: { xs: 'column', md: 'row' }` switch at `GuestListPanel.jsx:253`) or ≤768px to match `SlideMenu.jsx:20`. Record the answer in `plan.md`. This gates T007.
- [X] T002 Confirm whether the `100vh` → `100dvh` correction described in `specs/007-guest-list-mobile-selector/research.md` R1/R3 is in scope for this change. Record the answer in `plan.md`. This gates T015-T018.
- [ ] T003 [P] Reproduce the defect on a **real phone** per `specs/007-guest-list-mobile-selector/quickstart.md` → Scenario 0, and capture a screenshot showing the clipped pagination bar. Keep it for comparison in T014. **[NOT RUN]** — requires a physical phone; I have no device access. This is the "before" baseline. Capture it before merging, or T015 has nothing to compare against.
- [X] T004 [P] Identify an event whose guest list exceeds one page using the query in `specs/007-guest-list-mobile-selector/quickstart.md` → Setup; without >25 guests the pagination arrows are disabled and prove nothing.

**Checkpoint**: Decisions settled, "before" evidence captured, test data identified.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend `EventSearch` so it can render usefully inside a dialog. Both stories depend on
this, and it must not alter any selection or fetch behaviour.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Add an optional `listHeight` prop to `public/src/components/Dashboard/WhatsApp/EventSearch.jsx`, applied to the list `Box` at line 109-112, defaulting to the current value `{ xs: 'calc(20dvh - 60px)', md: 'calc(85dvh - 60px)' }` so the inline desktop rendering is unchanged (FR-002).
- [X] T006 Add an optional `onSelected` callback prop to `public/src/components/Dashboard/WhatsApp/EventSearch.jsx`, invoked inside `handleSelect` **after** the existing `setSelectedEvent` dispatch. Do not modify `fetchGuestList`, the `abortRef` / `AbortController` handling, the refetch-nonce effect, `eventIdRef`, or any `dispatch(...)` call — those are the forbidden changes listed in `contracts/ui-contract.md`.
- [X] T007 Verify `public/src/components/Dashboard/WhatsApp/EventSearch.jsx` still renders identically in the existing inline desktop layout with neither new prop passed, confirming both defaults are inert.

**Checkpoint**: `EventSearch` is reusable in a dialog without behaviour drift.

---

## Phase 3: User Story 2 - Choose an event from a modal on mobile (Priority: P1) 🎯 MVP

**Goal**: On mobile, replace the inline event list with a compact trigger plus a modal containing
the same searchable `EventSearch`. This is where all of the feature's code lives.

**Independent Test**: `quickstart.md` Scenarios 2, 3 and 6 — the trigger shows the selected event
(truncated if long) or "Select an event"; tapping opens a dialog; search filters; selecting loads
the guest list and closes the dialog; backdrop/Esc/Cancel leave the selection unchanged.

### Implementation for User Story 2

- [X] T008 [US2] Add the viewport branch and modal state to `public/src/components/Dashboard/WhatsApp/GuestListPanel.jsx`: `const isMobile = useMediaQuery(theme.breakpoints.down(<T001 breakpoint>))` and `const [eventModalOpen, setEventModalOpen] = useState(false)`, importing `useMediaQuery` and `useTheme` from `@mui/material` as `CustomDataGrid.jsx:89` does.
- [X] T009 [US2] In `public/src/components/Dashboard/WhatsApp/GuestListPanel.jsx`, replace the mobile rendering of the `280px` selector `Box` (lines 260-262) with a full-width MUI `Button` trigger showing the selected event's `title` or "Select an event", styled with `textOverflow: 'ellipsis'`, `overflow: 'hidden'`, `whiteSpace: 'nowrap'` so a long title truncates on one line rather than wrapping (FR-007). Use a real `Button`, not a styled `div`, so it is keyboard- and screen-reader-accessible.
- [X] T010 [US2] Keep the desktop branch in `public/src/components/Dashboard/WhatsApp/GuestListPanel.jsx` rendering the identical element tree it renders today — `<Box sx={{ flexShrink: 0, width: { xs: '100%', md: 280 } }}><EventSearch /></Box>` — so FR-002/SC-003 hold by construction rather than by visual inspection.
- [X] T011 [US2] Add the selection `Dialog` to `public/src/components/Dashboard/WhatsApp/GuestListPanel.jsx`, mounted only when `isMobile`: `<Dialog open={eventModalOpen} onClose={...} maxWidth="sm" fullWidth>` with `DialogTitle` "Select Event", `DialogContent dividers` containing `<EventSearch />` with a `listHeight` suited to the dialog, and a `DialogActions` Cancel button — matching the `NotepadModal.jsx:106` and QR-viewer (`GuestListPanel.jsx:316`) pattern. Do not use `fullScreen`; it appears nowhere in this codebase.
- [X] T012 [US2] Pass `onSelected={() => setEventModalOpen(false)}` to the `EventSearch` inside the dialog in `public/src/components/Dashboard/WhatsApp/GuestListPanel.jsx`, so choosing an event closes the modal (FR-004) while selection and fetching stay entirely inside `EventSearch`.
- [X] T013 [US2] Add an effect to `public/src/components/Dashboard/WhatsApp/GuestListPanel.jsx` that forces `setEventModalOpen(false)` when `isMobile` becomes false, so the dialog cannot be left orphaned over the desktop layout after a resize (spec Edge Cases).
- [ ] T014 [US2] Validate User Story 2 on a real phone per `specs/007-guest-list-mobile-selector/quickstart.md` Scenarios 2, 3 and 6, including the "select the already-selected event" case, which must close the dialog without a second network request. **[PARTIAL]** — code complete and statically verified (build passes, `EventSearch` still has exactly one consumer, desktop branch passes no props). The on-device interaction pass (Scenarios 2, 3, 6) still needs a phone.

**Checkpoint**: Event selection works on mobile through the modal, and ~20dvh has been reclaimed.

---

## Phase 4: User Story 1 - Reach the pagination on a phone (Priority: P1)

**Goal**: The guest grid's pagination bar is fully visible and tappable on a real device.

**Independent Test**: `quickstart.md` Scenario 1 — pagination visible without scrolling or zooming,
in both orientations, and on iOS with the URL bar both expanded and collapsed.

**Depends on**: US2. This story has almost no unique code — the reachability is *delivered* by the
space US2 reclaims. T015-T018 are the optional root-cause fix; T019 is the verification.

- [ ] T015 [US1] Verify on a real phone per `specs/007-guest-list-mobile-selector/quickstart.md` Scenario 1 that the pagination bar is now fully visible and the next-page arrow works, comparing against the T003 baseline screenshot. Test both orientations and, on iOS, both with the URL bar expanded (worst case, immediately after load) and collapsed. **[NOT RUN]** — requires a physical phone. This is the acceptance check for the whole feature; the fix is reasoned and built but not observed on a device.
- [X] T016 [US1] **[Only if T002 said yes]** Change `height: 100vh` to `height: 100dvh` on the `.slide-menu` rule at line 23 of `public/src/components/SlideMenu/SlideMenu.css`. This is the file that actually loads.
- [X] T017 [US1] **[Only if T002 said yes]** Make the same `100vh` → `100dvh` change on the `.slide-menu` rule at line 24 of `public/src/components/SlideMenu/SlideMenu.scss`, so the uncompiled source does not silently diverge. Leave the `.slide-menu-backdrop` rule alone — an oversized fixed overlay is harmless.
- [X] T018 [US1] **[Only if T002 said yes]** Confirm the correction actually took effect by grepping both files per `specs/007-guest-list-mobile-selector/quickstart.md` → "If the 100vh → 100dvh correction is included". There is no `sass` dependency and the build is plain `vite`, so a change made only to the `.scss` is inert and will still review as correct.
- [ ] T019 [US1] **[Only if T002 said yes]** On a real phone, open every `SlideMenu` panel — Contact Book, Guest List, Event List, Event Logs, Delivery Logs, Response Logs, Unsubscribed — and confirm each panel's bottom edge sits above the browser chrome and nothing scrolls oddly. `SlideMenu.css` is shared by all seven. **[NOT RUN]** — requires a physical phone. `SlideMenu.css` is shared by all seven panels, so this cross-panel pass matters before merge.

**Checkpoint**: The reported defect is fixed and, if T002 said yes, its cause is removed for every panel.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T020 [P] Confirm desktop is unchanged per `specs/007-guest-list-mobile-selector/quickstart.md` Scenario 4 — at ≥900px the event list is inline in the left column, with no trigger button and no dialog mounted. Visually diff against `main` if unsure. **[PARTIAL]** — verified statically: the desktop branch passes no props and both new `EventSearch` defaults are byte-identical to `origin/main`'s hardcoded values, so the desktop tree is unchanged by construction. A visual confirmation in a desktop browser is still worth doing.
- [ ] T021 [P] Run the breakpoint-crossing checks in `specs/007-guest-list-mobile-selector/quickstart.md` Scenario 5: narrowing switches to the trigger; widening while the modal is open closes it and retains the selection; rotating the phone preserves selection and guest list. **[NOT RUN]** — needs a running dev server and a browser to resize across 900px.
- [ ] T022 [P] Run the panel regression checks in `specs/007-guest-list-mobile-selector/quickstart.md` Scenario 7 — attendance chip, mark attended, remove guest, notepad, QR viewer. These share the per-event state wipe at `GuestListPanel.jsx:64-79`, so modal wiring mistakes surface here first. **[NOT RUN]** — needs a running dev server, a logged-in dashboard session, and an event with guests.
- [X] T023 [P] Confirm `EventSearch` still has no consumer outside Guest List by running the grep in `specs/007-guest-list-mobile-selector/quickstart.md` → Regression checks; only `GuestListPanel.jsx` should appear.
- [X] T024 Run `npm run lint` and `npm run build` from `public/package.json` scripts and confirm no *new* lint errors versus `main` in `public/src/components/Dashboard/WhatsApp/GuestListPanel.jsx` and `public/src/components/Dashboard/WhatsApp/EventSearch.jsx` — this repo has pre-existing lint errors, so compare counts by rule rather than expecting zero.
- [X] T025 Update `specs/007-guest-list-mobile-selector/plan.md` to record the resolved T001 and T002 decisions, replacing the "Open Questions for the User" section with the outcomes.
- [X] T026 Before opening a PR, confirm the working branch was created from `main` and not from `006-unsubscribe-contacts-list` (which has open PR #67), per `specs/007-guest-list-mobile-selector/plan.md` → Branching Note, so the two features stay independently reviewable.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T001 gates T008; T002 gates T016-T019.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS both user stories.
- **User Story 2 (Phase 3)**: Depends on Foundational. Contains all the implementation.
- **User Story 1 (Phase 4)**: Depends on US2 being complete.
- **Polish (Phase 5)**: Depends on both stories.

### User Story Dependencies

- **US2 (P1)**: The mechanism. Independently testable once Phase 2 is done, and it is where every
  line of feature code lives.
- **US1 (P1)**: **Not independent, and not a parallel track.** The spec says so directly — US2 is
  "the *mechanism* by which US1 is achieved". US1's phase is verification plus the optional
  root-cause fix. Do not assign US1 to a second developer expecting separable work; there is
  essentially none until US2 lands.

This is an honest deviation from the usual "each story is an independent slice" structure. Forcing
independence here would mean inventing a second way to reclaim vertical space, which is not what
was asked for.

### Within Each Story

- Props (T005, T006) before the dialog that passes them (T011, T012).
- State (T008) before the trigger (T009) and dialog (T011) that read it.
- All of T008-T013 edit `GuestListPanel.jsx` and must be sequential.
- The real-device baseline (T003) must precede the fix, or T015 has nothing to compare against.

### Parallel Opportunities

- **Phase 1**: T003 and T004 are `[P]` — independent, and both are read-only investigation.
- **Phase 2**: T005 and T006 both edit `EventSearch.jsx` — **sequential**.
- **Phase 3**: none. Every task edits `GuestListPanel.jsx`.
- **Phase 4**: T016 (`.css`) and T017 (`.scss`) touch different files but are a single logical
  change; do them together and verify with T018.
- **Phase 5**: T020-T023 are `[P]` — independent manual checks that can be split across people or
  devices.

Parallelism is genuinely limited here: this is a two-file change, and one of those files takes
seven sequential edits.

---

## Parallel Example: Phase 5

```bash
# Independent manual checks — split across people or devices:
Task: "Confirm desktop unchanged (quickstart Scenario 4)"
Task: "Run breakpoint-crossing checks (quickstart Scenario 5)"
Task: "Run panel regression checks (quickstart Scenario 7)"
Task: "Confirm EventSearch has no other consumer"

# NOT parallelizable — all seven edit GuestListPanel.jsx:
#   T008 state → T009 trigger → T010 desktop branch → T011 dialog
#   → T012 onSelected → T013 resize effect → T014 validate
```

---

## Implementation Strategy

### MVP (US2 + the US1 verification)

1. Phase 1: settle the breakpoint and dvh questions, capture the "before" screenshot.
2. Phase 2: extend `EventSearch` with two inert-by-default props.
3. Phase 3: build the trigger and modal in `GuestListPanel`.
4. **STOP and VALIDATE on a real phone**: `quickstart.md` Scenarios 1, 2, 3, 6.
5. Ship. The reported defect is fixed and mobile operators get their screen space back.

Unlike a typical feature, there is no smaller shippable slice: US2 without US1's verification is
untested, and US1 without US2 has no implementation.

### Incremental Delivery

1. Setup + Foundational → `EventSearch` is dialog-ready, nothing user-visible has changed yet.
2. US2 + US1 verification → **the shippable increment**.
3. Optionally T016-T019 → root cause removed for all seven panels.
4. Polish → desktop, breakpoint crossing, regressions.

### On the optional root-cause fix

T016-T019 are one line in two files, and they are the difference between fixing this panel and
fixing the class of bug. If T002 defers them, expect the same report against another panel later,
and expect Guest List to regress the moment anything is added above the grid.

---

## Notes

- `[P]` = different files, no dependencies on incomplete tasks.
- No test tasks: no framework is configured. Validation is `quickstart.md`, on a real device.
- Three tasks are the ones most likely to be skipped and most likely to matter: **T003** (capture
  the "before" state — without it you cannot prove the fix), **T018** (confirm the `.css` actually
  changed — the `.scss` is not compiled), and **T019** (the shared stylesheet affects all seven
  panels).
- Commit after each task or logical group.
