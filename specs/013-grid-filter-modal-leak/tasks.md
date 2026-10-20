---

description: "Task list for 013-grid-filter-modal-leak"
---

# Tasks: CustomDataGrid filter panel leaks after container closes

**Input**: Design documents from `/specs/013-grid-filter-modal-leak/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/filter-panel-lifecycle.md ✅, quickstart.md ✅

**Tests**: No automated test tasks — this project has no frontend test runner (scripts are `dev`/`build`/`lint`/`preview`/`check:compiler`) and none was requested. Validation is manual via `quickstart.md`, gated by `npm run lint` and `npm run check:compiler`.

**Organization**: Tasks are grouped by user story. This is a single-file fix in `public/src/components/CustomDataGrid.jsx` (the `GridToolbar` sub-component); all 12 `CustomDataGrid` call sites benefit with no call-site changes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files / independent, read-only, no dependency on incomplete tasks)
- **[Story]**: US1, US2 (maps to spec.md user stories)
- Exact file paths are included in each task

## Path Conventions

- Frontend SPA lives under `public/`. The only edited source file is `public/src/components/CustomDataGrid.jsx`.
- Commands (`npm run …`) are run from the `public/` directory.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish a clean baseline so any post-change issue is attributable to this fix.

- [X] T001 From `public/`, run `npm run lint` and `npm run check:compiler` and confirm a clean baseline (note any pre-existing warnings unrelated to `public/src/components/CustomDataGrid.jsx`). **Baseline recorded**: repo lint is already red — `CustomDataGrid.jsx` has 56 pre-existing `react/prop-types` errors + 3 `react-hooks/exhaustive-deps` warnings; compiler healthcheck does **not** flag `CustomDataGrid.jsx`. Success criterion is therefore "no NEW problems".

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure shared by all user stories.

**None.** This is a localized behaviour fix in one existing component — there is no shared infrastructure, schema, model, or dependency to build before the user stories. Proceed directly to Phase 3.

**Checkpoint**: Nothing to block on — User Story 1 can begin.

---

## Phase 3: User Story 1 - Filter panel disappears when the slider closes (Priority: P1) 🎯 MVP

**Goal**: The toolbar **Filters** panel must never outlive the grid's on-screen visibility. When a sliding container (`SlideMenu` / `SlideModalProvider`) hides or removes the grid, the `document.body`-portaled Filters panel must close. Satisfies INV-1 and contract C-1, C-2, C-6.

**Independent Test**: In WhatsApp → Contact Book (grid stays mounted, hidden via `translateX`), open **Filters**, then close the slider via **×**, **backdrop**, and **Escape**. Each close must remove the Filters panel (zero filter-panel nodes under `<body>`). Switching to another slider while Filters is open must also leave nothing behind; reopening shows Filters closed.

### Implementation for User Story 1

- [X] T002 [US1] In `public/src/components/CustomDataGrid.jsx`, inside `GridToolbar`, add `const toolbarRef = useRef(null);` and attach it (`ref={toolbarRef}`) to the toolbar's outermost root `<Box>` (the container returned by `GridToolbar`, ~line 363). This is the element whose visibility bounds the panel's lifetime (data-model `toolbarRef`).
- [X] T003 [US1] In the same `GridToolbar` in `public/src/components/CustomDataGrid.jsx`, add a `useEffect` with dependency `[filterOpen]` that — only while `filterOpen` is `true` and `toolbarRef.current` and `window.IntersectionObserver` exist — creates an `IntersectionObserver` observing `toolbarRef.current` and calls `setFilterOpen(false)` when the entry reports `isIntersecting === false`; the effect cleanup must `disconnect()` the observer. When `IntersectionObserver` is unavailable or the ref is null, the effect is a safe no-op. This closes the panel on `display:none`, `translateX` off-screen, and detachment (research Decision; contract C-1/C-2).
- [X] T004 [US1] In the same component in `public/src/components/CustomDataGrid.jsx`, add a defensive mount-cleanup `useEffect(() => () => setFilterOpen(false), [])` so the open flag never survives a true `GridToolbar` unmount (complements React's own portal teardown for the conditionally-unmounted panels; data-model transition #4).
- [ ] T005 [US1] ⏳ **PENDING interactive browser pass** (requires dashboard login; not run in this session) — Manually validate `quickstart.md` Scenarios A, B, C, and E against a running app (`cd public && npm run dev`): close via ×/backdrop/Escape on Contact Book (A), switch sliders with Filters open (B), Delivery Logs conditional-unmount path (C), and clean reopen (E). Confirm zero filter-panel nodes remain under `<body>` once the grid is hidden/closed.

**Checkpoint**: The reported bug is fixed and verifiable on its own — this is the shippable MVP.

---

## Phase 4: User Story 2 - No regression for inline grids (Priority: P2)

**Goal**: Preserve the existing Filters UX for grids rendered inline (not in a slider): open under the button, stay anchored on small scrolls, dropdowns inside the panel don't dismiss it, Escape + × still close. Satisfies contract C-3, C-4, C-5.

**Independent Test**: On an inline grid page, open **Filters**, change column/operator via the in-panel `Select`s (panel must stay open), edit a value (rows filter), scroll a little (panel stays anchored), then close via Escape and ×.

### Implementation for User Story 2

- [X] T006 [US2] Review the observer added in T003 (`public/src/components/CustomDataGrid.jsx`) to confirm it observes the **toolbar root** with the default threshold (`0`) — not the panel, the button, or the whole grid `Paper` — so that partial toolbar visibility during normal inline scrolling keeps the panel open (prevents false auto-close). Adjust the observed target/threshold if this does not hold.
- [ ] T007 [US2] ⏳ **PENDING interactive browser pass** (not run in this session) — Manually validate `quickstart.md` Scenario D on an inline grid: Filters opens under the button; opening the column/operator `Select` dropdowns does **not** close the panel (C-5); a small content scroll keeps the panel anchored (C-3); all filter operators behave as before; Escape and the panel **×** both close it (C-4).

**Checkpoint**: US1 and US2 both verified — the fix works and nothing regressed.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final gates and scope/non-regression confirmation.

- [X] T008 From `public/`, run `npm run lint` and `npm run check:compiler`; resolve any issue attributable to `public/src/components/CustomDataGrid.jsx` (SC-005). **Result**: ESLint identical to baseline (59 problems, 0 new); compiler healthcheck still does not flag the file; `npm run build` succeeds (3403 modules, clean exit).
- [ ] T009 [P] Confirm scope: `git diff --name-only` shows only `public/src/components/CustomDataGrid.jsx` changed — no edits to any of the 12 call sites, `SlideMenu.jsx`, or `SlideModalProvider.jsx` (SC-004, contract C-7).
- [ ] T010 [P] Spot-check non-regression of the adjacent **Columns** `Popover` and (if reachable) any `SlideModalProvider`-hosted grid: confirm no new orphaned surfaces and no change to Columns behaviour.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Empty — nothing to block on.
- **User Stories (Phase 3–4)**: Depend only on the code change in US1. US2 verification depends on US1's implementation (T002–T004) being in place.
- **Polish (Phase 5)**: After US1 (and ideally US2) are complete.

### User Story Dependencies

- **User Story 1 (P1)**: The code change. No dependency on other stories. MVP.
- **User Story 2 (P2)**: Shares the same single edit; its correctness is a property of how US1 is implemented (observe toolbar root, threshold 0). T006–T007 verify it; they require T002–T004 done.

### Within Each User Story

- US1: T002 → T003 → T004 are sequential edits to the **same file/component** (not parallel), then T005 validates.
- US2: T006 (code review/guard) → T007 (manual validation).

### Parallel Opportunities

- Because the fix is confined to one file, the code tasks (T002–T004, T006) are **sequential**, not parallel.
- `[P]` applies only to the independent, read-only polish checks **T009** and **T010**, which can run together after the code is done.
- Manual validation T005 (US1) and T007 (US2) can be exercised by different testers in parallel once the code change is in.

---

## Parallel Example: Polish phase

```bash
# After the code change is committed, these read-only checks run together:
Task: "T009 git diff --name-only — confirm only CustomDataGrid.jsx changed"
Task: "T010 spot-check Columns Popover + SlideModalProvider-hosted grid for orphaned surfaces"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (T001 baseline).
2. Phase 2: Foundational — none.
3. Phase 3: User Story 1 (T002–T005) — the fix.
4. **STOP and VALIDATE**: run `quickstart.md` Scenarios A/B/C/E. This alone resolves the reported bug.
5. Ship/demo.

### Incremental Delivery

1. Setup → US1 (T002–T005): bug fixed, MVP shippable.
2. US2 (T006–T007): confirm inline grids didn't regress.
3. Polish (T008–T010): static gates + scope/non-regression confirmation.

---

## Notes

- `[P]` = independent/read-only, safe to run together; the core edit is single-file and therefore sequential.
- `[Story]` labels map tasks to spec.md user stories for traceability.
- No automated tests are added (no harness in-repo, none requested); acceptance is `quickstart.md` + lint + compiler.
- Keep the change inside `GridToolbar`; do not alter `CustomDataGrid` props or any call site (contract C-7).
- Commit after US1 (MVP), then after US2, then after Polish.
