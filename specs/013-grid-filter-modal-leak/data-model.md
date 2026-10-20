# Phase 1 Data Model: Filter panel UI state

This feature has **no persisted data and no backend entities**. The only "model" is the client-side UI state that
governs the Filters panel inside `GridToolbar` (`public/src/components/CustomDataGrid.jsx`). It is documented here
as a small state machine because the fix is defined by its state transitions.

## State owned by `GridToolbar`

| Field | Type | Meaning | Lifecycle |
|---|---|---|---|
| `filterOpen` | `boolean` | Whether the Filters panel is rendered (portaled to `document.body`). | Component-local `useState`. |
| `filterPos` | `{ top: number, left: number }` | Viewport coordinates for the fixed panel, from the Filters button's `getBoundingClientRect()`. | Set on open; updated by the scroll/resize reposition effect. |
| `filterAnchorRef` | `ref<HTMLElement>` | The Filters button element (reposition source). | Set on open. |
| `toolbarRef` *(new)* | `ref<HTMLElement>` | The `GridToolbar` root `Box`; the element whose on-screen visibility bounds the panel's lifetime. | Stable for the toolbar's lifetime. |

> The grid also owns filter *data* (`filters` / `activeFilters`: `{ id, field, operator, value }[]`). That is
> unchanged by this feature and is described by the existing component props, not here.

## Derived signal (new)

| Signal | Source | Definition |
|---|---|---|
| `toolbarVisible` | `IntersectionObserver` on `toolbarRef` | `true` while the toolbar intersects the viewport; `false` when it is `display:none`, translated out of the viewport, or detached. Observed **only while `filterOpen` is `true`**. |

## State transitions

```text
          openFilter() (click Filters button)
 CLOSED ───────────────────────────────────────────────▶ OPEN
   ▲                                                       │
   │  setFilterOpen(false) on ANY of:                      │
   │    • × button (FilterPanel onClose)                   │
   │    • Escape key                                       │  (while OPEN)
   │    • toolbarVisible → false   ◀── NEW (the fix)       │  scroll/resize → reposition only
   │    • GridToolbar unmount      ◀── NEW (defensive)     │
   └───────────────────────────────────────────────────────┘
```

### Transition rules

- **CLOSED → OPEN**: user clicks the Filters button. Capture anchor rect into `filterPos`, store
  `filterAnchorRef`, set `filterOpen = true`. Start observing `toolbarRef`.
- **OPEN → OPEN** (no exit): scroll/resize updates `filterPos` so the panel stays anchored (existing behaviour,
  unchanged). Opening a MUI `Select` inside the panel does **not** change `toolbarVisible` (the toolbar stays on
  screen), so it must not close the panel.
- **OPEN → CLOSED** happens on the **first** of:
  1. `FilterPanel` × button → `onClose`.
  2. Escape key (existing listener).
  3. **`toolbarVisible` becomes `false`** — the grid's container hid or slid it away, or it is being removed. *(new)*
  4. **`GridToolbar` unmounts** — cleanup resets the flag; React also removes the portal. *(new, defensive)*
- On CLOSED, stop observing; nothing is portaled to `document.body`.

## Invariant (the whole point of the fix)

> **INV-1**: `filterOpen === true` ⇒ the `GridToolbar` that owns it is currently visible on screen.
> Equivalently: when the toolbar is not visible, no Filters panel exists under `<body>`.

This invariant is what [contracts/filter-panel-lifecycle.md](./contracts/filter-panel-lifecycle.md) asserts and
what [quickstart.md](./quickstart.md) verifies.
