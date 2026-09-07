# Phase 0 Research: Guest List Mobile Selector Modal

**Feature**: `007-guest-list-mobile-selector` | **Date**: 2026-09-07

All findings verified against the current source tree.

---

## R1. Root cause of the unreachable pagination (most important finding)

**Question**: Why is the pagination bar unreachable on real devices but fine in a desktop browser's
mobile emulator?

**Finding**: Two things combine, and neither is in `GuestListPanel` itself.

1. **`.slide-menu` is sized with `height: 100vh`** (`SlideMenu.css:23`, `SlideMenu.scss:24`).
   On mobile browsers `100vh` is the *static* viewport height — the height with the URL bar and
   toolbars **hidden**. The actually-visible area is smaller, typically by 60–110px. So the bottom
   strip of the panel is laid out underneath the browser chrome.

2. **Nothing overflows, so nothing scrolls.** `.slide-menu` has `overflow-y: auto`, but the inner
   content is sized in *fixed* `dvh` units (`GuestListPanel` grid box `60dvh`, `EventSearch` list
   `calc(20dvh - 60px)`), which are computed against the smaller **dynamic** viewport. The content
   therefore always fits inside the taller `100vh` box, the scrollbar never engages, and the
   clipped strip cannot be scrolled into view.

The pagination bar sits at the very bottom of the grid box (`CustomDataGrid` renders it last in a
`height: 100%`, `overflow: hidden` flex column), which is exactly the clipped region.

**Vertical budget on mobile** (all from the source):

| Element | Height |
|---|---|
| `.slide-menu__header` | ~49px (12px padding ×2 + ~25px title) |
| `.slide-menu__content` padding | 32px (16px ×2) |
| `GuestListPanel` root padding `p: 1` | 16px |
| `EventSearch` search input + margin | ~42px |
| `EventSearch` list `calc(20dvh - 60px)` | 20dvh − 60px |
| flex `gap: 2` | 16px |
| grid box `{ xs: '60dvh' }` | 60dvh |
| **Total** | **≈ 80dvh + 95px** |

On a 640px visible viewport that is ~607px of content laid out inside a `100vh` (~740px) panel —
it fits the box, so no scroll, but the last ~30–50px falls outside the visible area. On smaller
phones (iPhone SE class) the shortfall is larger.

**Decision**: Treat the ~20dvh reclaimed by moving `EventSearch` into a modal as the fix for this
panel (the user's requested approach), and record the `100vh` → `100dvh` correction as a separate,
clearly-scoped item.

**Rationale**: Removing the inline event list drops the budget from ≈80dvh + 95px to ≈60dvh + 95px
— roughly 128px reclaimed on a 640px viewport, comfortably more than the 30–50px shortfall. So the
requested approach does genuinely fix the reported symptom.

**But it treats the symptom, not the cause.** Every other slide panel keeps the same latent bug,
and this one could regress if anything is later added above the grid. The one-line `100vh` →
`100dvh` change removes the cause for all panels and is a no-op on desktop, where `dvh == vh`.

**Alternatives considered**:
- *Only change `100vh` → `100dvh`, skip the modal* — rejected: it would fix reachability but ignore
  the user's explicit request, and the top strip would still consume 20dvh of a small screen.
- *Make the grid box scroll instead* — rejected: nested scroll regions inside a slide panel are
  awkward on touch, and the pagination would still be inside the scrolled area.

---

## R2. `EventSearch` is used in exactly one place

**Finding**: `grep` across `public/src` shows `EventSearch` imported only by
`GuestListPanel.jsx:2` and rendered only at `GuestListPanel.jsx:261`.

**Decision**: Reuse the existing `EventSearch` component *inside* the modal, unchanged, rather than
building a new selector.

**Rationale**: Zero blast radius, and all of the selection logic — the debounced filter, the
`AbortController`-guarded fetch, `setSelectedEvent` / `setSelectedGuestList` /
`setGuestListLoading` dispatches, and the refetch-nonce effect — stays untouched. That directly
satisfies FR-004 and SC-005: the network behaviour cannot drift because the code does not move.

**Alternatives considered**:
- *Reuse `EventDropdownSearch.tsx`* — rejected. It is a controlled dropdown
  (`onSelect(name, value)`) used by `MessageModal`; it does not dispatch to redux or fetch the
  guest list, so it would need new wiring, and an absolutely-positioned dropdown inside a slide
  panel on touch has its own clipping problems.
- *Write a new mobile-only selector* — rejected: duplicates the fetch/abort logic, and two
  implementations of "pick an event" will drift.

**Implementation note**: `EventSearch`'s internal list uses
`height: { xs: 'calc(20dvh - 60px)', md: 'calc(85dvh - 60px)' }` (`EventSearch.jsx:110-112`). Inside
a modal, `20dvh` is too short to be useful — the modal has room for more. The list height needs to
be overridable (a prop) or adjusted for the modal context.

---

## R3. `SlideMenu.scss` is not compiled — the committed `.css` is what loads

**Finding**: `SlideMenu.jsx:2` imports `"./SlideMenu.css"`. `public/package.json` has **no** `sass`
dependency and its scripts are plain `vite` / `vite build` — nothing compiles `.scss`. Both
`SlideMenu.scss` and the generated `SlideMenu.css` (+ `.css.map`) are committed.

**Decision**: If the `100vh` → `100dvh` correction is taken, edit **both** files — `.css` because it
is what actually loads, `.scss` so the source of truth does not silently diverge.

**Rationale**: This is a live trap. Editing only the `.scss` produces a change that looks correct in
review and does nothing at runtime. Both files currently contain `100vh` at two places each
(`.slide-menu-backdrop` and `.slide-menu`).

**Note**: only the `.slide-menu` rule matters for this defect; the backdrop is a fixed overlay where
being oversized is harmless.

---

## R4. Three conflicting definitions of "mobile"

**Finding**: There is no `createTheme` anywhere in `public/src`, so MUI defaults apply
(xs=0, sm=600, md=900). Three different thresholds are in use:

| Location | Threshold | Mechanism |
|---|---|---|
| `GuestListPanel.jsx:253` | **<900px** (`xs` vs `md`) | MUI `sx` responsive values |
| `SlideMenu.jsx:20,25` | **≤768px** | `window.innerWidth <= 768` |
| `CustomDataGrid.jsx:89,326,677` | **<600px** (`sm`) | `useMediaQuery(theme.breakpoints.down('sm'))` |

A 700px-wide device is "mobile" to `SlideMenu`, "mobile" to `GuestListPanel`, but "desktop" to
`CustomDataGrid`.

**Decision**: Use the MUI `md` breakpoint (<900px) — `useMediaQuery(theme.breakpoints.down('md'))`
— to switch the selector between inline and modal.

**Rationale**: It is the *same* breakpoint `GuestListPanel` already uses to switch this exact
layout from row to column (`flexDirection: { xs: 'column', md: 'row' }`). Using anything else would
create a band of widths where the layout is stacked but the selector is still inline, or vice
versa — a new inconsistency on top of the three that already exist.

**Flagged for the user**: the spec assumption records this. If "mobile" was meant as ≤768px to match
`SlideMenu`, say so — but then the 768–900px band gets the stacked layout with a modal selector,
which is still coherent, just different.

**Out of scope**: unifying the three thresholds. Worth doing, but not inside a targeted bug fix.

---

## R5. The modal pattern to follow

**Finding**: `fullScreen` appears **nowhere** in `public/src`. The established dialog pattern is
MUI `Dialog` with `maxWidth` + `fullWidth`:

- `NotepadModal.jsx:106` — `<Dialog open onClose maxWidth="sm" fullWidth>`
- `GuestListPanel.jsx:316` — the QR viewer, `<Dialog open onClose maxWidth="xs">`

Both use `DialogTitle` / `DialogContent` / `DialogActions`.

**Decision**: `<Dialog maxWidth="sm" fullWidth>` with `DialogTitle` ("Select Event"),
`DialogContent` holding `EventSearch`, and a `DialogActions` cancel button.

**Rationale**: Matches the two dialogs already inside this very panel, so it inherits their look,
their escape/backdrop behaviour, and the reviewer's expectations. Introducing `fullScreen` here
would make this the only full-screen dialog in the app.

---

## R6. The pagination is rendered on mobile — this is purely positional

**Finding**: `CustomDataGrid.jsx:934-957` always renders the `TablePagination` inside a bordered
`Box`. Only two sub-elements are hidden on mobile: the "Rows per page" label
(`labelRowsPerPage={isMobile ? '' : ...}`) and the page-size select
(`'& .MuiInputBase-root': { display: isMobile ? 'none' : 'flex' }`).

**Decision**: Change nothing in `CustomDataGrid`.

**Rationale**: The page arrows and the "1–25 of N" label are already present and functional on
mobile. The bug is that they are painted outside the visible viewport, which R1 explains and this
feature fixes by reclaiming vertical space. No grid change is warranted.

**Consequence**: the page-size select stays hidden on mobile (<600px, per R4), so mobile operators
page through in fixed 25-row increments. That is existing behaviour, not a regression introduced
here — but worth confirming it is acceptable, since paging 25-at-a-time through a large guest list
is slow. Out of scope for this fix.

---

## Resolved unknowns

| Unknown | Resolution |
|---|---|
| Why is pagination unreachable | `100vh` panel + no overflow to scroll — R1 |
| Does the requested modal actually fix it | Yes, reclaims ~20dvh vs a 30–50px shortfall — R1 |
| Which selector is "select the guest list" | `EventSearch` — the event picker — R2 |
| Build a new selector or reuse | Reuse `EventSearch` inside the modal — R2 |
| Which breakpoint is "mobile" | MUI `md` (<900px), matching the existing layout switch — R4 |
| Which modal component | `Dialog maxWidth="sm" fullWidth`, as used twice in this panel — R5 |
| Does `CustomDataGrid` need changing | No — R6 |

## Open questions (do not block Phase 1)

1. **Breakpoint** — `md` (<900px) assumed; confirm if ≤768px was intended (R4).
2. **The `100vh` → `100dvh` correction** — recommended, but it touches a stylesheet shared by every
   slide panel. Take it now or defer? (R1, R3)
