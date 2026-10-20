# Phase 0 Research: Filter panel leaks after container closes

## 1. Root-cause analysis

### What renders the panel

`public/src/components/CustomDataGrid.jsx` → `GridToolbar`:

```jsx
const [filterOpen, setFilterOpen] = useState(false);
const [filterPos, setFilterPos] = useState({ top: 0, left: 0 });   // viewport coords from getBoundingClientRect()
...
{filterOpen && createPortal(
  <Paper sx={{ position: 'fixed', top: filterPos.top, left: filterPos.left, zIndex: 1400, ... }}>
    <FilterPanel ... onClose={() => setFilterOpen(false)} />
  </Paper>,
  document.body               // ← panel is a child of <body>, NOT of the grid
)}
```

Close triggers today: the panel's own **×** button, the **Escape** key, and a scroll/resize listener that only
*repositions* the panel (it does not close it). There is **no** "click outside / backdrop" dismissal and **no**
link to the grid's own visibility.

### Why it survives a slider close

The grid is shown inside sliding containers:

- `SlideMenu` (`public/src/components/SlideMenu/SlideMenu.jsx`) — always renders `children`; open/close is pure CSS
  (`.slide-menu` `transform: translateX(100%)` → `.slide-menu.open` `translateX(0)`). No `display:none`, no
  unmount.
- `SlideModalProvider` (`public/src/components/Providers/SlideModalProvider.jsx`) — wraps content in `ReactModal`
  with `isOpen={true}` **hardcoded** and animates via inline `transform`; `modalState.content` is never cleared,
  so content is **never unmounted**.

In `WhatsApp.jsx` the grids sit inside `SlideMenu`s. Two mount patterns exist:

| Panel(s) | Pattern | Grid on close |
|---|---|---|
| `delivery-logs`, `response-logs` | `{openPanel === '…' && <CustomDataGrid/>}` | **Unmounts** |
| `contact-book`, `unsubscribed`, `guest-list`, `event-logs`, `event-list` | always rendered (some with a no-op `hidden` class — `.hidden` is not defined in `public/src` CSS) | **Stays mounted, hidden by `translateX`** |

- When the grid **unmounts** (delivery/response logs), React tears down the portal automatically — no leak there.
- When the grid **stays mounted but is translated off-screen** (the majority), `filterOpen` stays `true`. The
  panel is `position: fixed` **and lives in `<body>`, outside the slider's transformed subtree**, so the slider's
  `translateX(100%)` does not move it. It keeps painting at its last on-screen coordinates. **This is the reported
  bug.**

> CSS note that makes the leak specific to the body portal: a `position: fixed` element that is a DOM descendant of
> an element with a `transform` is positioned relative to that transformed ancestor. If the panel were inside the
> slider it would slide away with it. Because it is portaled to `<body>`, it escapes the transform and stays put.

### Reconciling the user's wording

The report says "the CustomDataGrid is disposed." In the leaking panels it is **not** actually disposed — the
slider keeps it mounted and merely hides it. The symptom is exactly as described regardless; the fix must handle
"mounted but not visible," which also covers true unmount defensively.

## 2. Decision — how to fix

**Decision**: In `GridToolbar`, bind the panel's lifetime to the toolbar's real on-screen visibility. Attach a ref
to the toolbar root `Box`. While `filterOpen` is `true`, observe that element with an `IntersectionObserver`; when
the entry reports `isIntersecting === false`, call `setFilterOpen(false)`. Also add a mount-cleanup
(`useEffect(() => () => setFilterOpen(false), [])`) as defense for the unmount path. No other files change.

**Rationale**:

- `IntersectionObserver` fires for **all three** hide mechanisms that occur in this codebase: an ancestor becoming
  `display:none` (element has no box → not intersecting), a slider `translateX`-ing the element out of the viewport
  (intersection ratio → 0), and the element being removed. One mechanism, all cases.
- It is **grid-local**: fixes all 12 call sites with zero consumer/prop changes (FR-003, FR-005).
- It **preserves inline behaviour** (FR-004): a small scroll that keeps the toolbar on screen leaves the panel open
  and the existing scroll/resize reposition logic intact. The only behavioural delta is that scrolling the toolbar
  *entirely* out of the viewport now closes the panel instead of parking it off-screen — which is consistent with
  what the user already sees (the panel currently follows its anchor off-screen and becomes invisible anyway).
- It is **React-Compiler-safe** (FR-006): a plain effect with explicit dependencies and a cleanup that disconnects
  the observer; no manual memoization, no ref mutation during render.
- Minimal and dependency-free — `IntersectionObserver` is a browser baseline API.

**Why observe the toolbar root (not the button, not the grid `Paper`)**:

- The toolbar always contains the Filters button and is the top of the grid; if the grid hides or slides away, the
  toolbar goes with it.
- Observing the whole grid `Paper` could keep the panel "open" while only the grid's bottom is visible but the
  toolbar/anchor has scrolled off — leaving the panel parked off-screen. The toolbar is the tighter, correct proxy
  for "is the anchor on screen."

## 3. Alternatives considered

- **Do nothing at the grid; fix each slider to unmount content on close.** Rejected: touches `SlideMenu`,
  `SlideModalProvider`, and consumer wiring (blast radius across many files), risks the 300 ms slide-out animation,
  and still would not protect future containers. (The `SlideModalProvider` "never unmounts content" issue is real
  but separate; noted as out-of-scope — the grid fix already neutralises its effect on the Filters panel.)

- **Portal the panel into the grid's own subtree instead of `document.body`.** Would make hide/unmount cascade
  naturally, but a `position: fixed` panel inside a `transform`ed slider resolves its coordinates against the
  transformed ancestor, breaking the existing viewport-based `getBoundingClientRect()` positioning math. Requires
  reworking positioning; higher risk for no extra benefit over the observer.

- **Replace the hand-rolled portal with MUI `Popover`** (as the adjacent Columns panel already uses). Cleaner API
  and gives backdrop dismissal, but `Popover` also portals to `<body>`, so the mounted-but-hidden case **still
  leaks** unless combined with the same visibility detection — i.e. it does not fix the bug on its own, and it is a
  larger change to the responsive 480 px panel layout. Deferred; could be a future consistency refactor.

- **`useEffect` unmount cleanup only** (`() => setFilterOpen(false)`). Necessary but **insufficient**: it never
  runs for the leaking panels because they do not unmount. Kept as a defensive complement, not the primary fix.

- **Close on scroll-away via the existing scroll/resize listener.** Does not fire during a CSS `transform`
  transition (no scroll/resize event), so the slide-close case would still leak. Rejected as primary.

## 4. Open questions

None. The spec's assumptions resolve the ambiguity in the original report ("slider" = `SlideMenu` /
`SlideModalProvider`; "modal" = toolbar Filters panel). No `NEEDS CLARIFICATION` remain.
