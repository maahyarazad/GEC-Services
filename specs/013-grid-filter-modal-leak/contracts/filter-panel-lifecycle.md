# UI Contract: Filter panel lifecycle

This is the behavioural contract for the `CustomDataGrid` toolbar **Filters** panel. It is the interface this
feature must satisfy; `quickstart.md` is the manual conformance suite. (No network/API contract exists — this is a
pure client-side UI contract, which is the appropriate contract type for this project.)

## Scope

- **Component**: `GridToolbar` inside `public/src/components/CustomDataGrid.jsx`.
- **Surface under contract**: the Filters panel (`createPortal(..., document.body)`), its open/close state, and
  its relationship to the grid's visibility.
- **Not in scope**: the Columns `Popover` (already compliant via MUI), filtering logic/operators, grid props.

## Guarantees

| ID | Guarantee |
|---|---|
| **C-1** | When the owning `GridToolbar` is **not visible** on screen (ancestor `display:none`, translated out of the viewport, or unmounted), **no** Filters panel node exists in the DOM. |
| **C-2** | Closing a sliding container (`SlideMenu` / `SlideModalProvider`) by **any** of its affordances — close button, backdrop click, Escape — removes the Filters panel if it was open. |
| **C-3** | For an **inline** (non-slider) grid, opening Filters, editing filters, and scrolling the content a small amount (toolbar stays visible) leaves the panel open and anchored to the Filters button — identical to current behaviour. |
| **C-4** | Escape and the panel's **×** button continue to close the panel. |
| **C-5** | Opening a dropdown (`Select` for column/operator) **inside** the panel does not close the panel. |
| **C-6** | Re-opening a slider after it was closed shows the grid with the Filters panel **closed** (no stale panel reappears). |
| **C-7** | Public API unchanged: no new/renamed/removed `CustomDataGrid` props; no changes required at any of the 12 call sites. |

## Non-goals / explicit non-changes

- The panel still renders via a `document.body` portal and still positions with viewport coordinates (we only add
  a *close* trigger; we do not move the portal or change positioning math).
- `SlideMenu` and `SlideModalProvider` are **not** modified by this feature.
- No automated test framework is introduced.

## Conformance

- **Manual**: all steps in [quickstart.md](./quickstart.md) pass.
- **Static**: `npm run lint` and `npm run check:compiler` pass (run from `public/`).
- **Invariant**: satisfies INV-1 in [data-model.md](./data-model.md).
