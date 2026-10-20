# Implementation Plan: CustomDataGrid filter panel leaks after container closes

**Branch**: `013-grid-filter-modal-leak` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-grid-filter-modal-leak/spec.md`

## Summary

The grid toolbar's **Filters** panel is rendered with `createPortal(<Paper position:fixed>, document.body)` and its
open flag (`filterOpen`) is state local to `GridToolbar`. Because the panel is a child of `<body>` — structurally
detached from the grid — it does not inherit the visibility of whatever container shows the grid. The app's sliding
containers (`SlideMenu`, `SlideModalProvider`) keep their children **mounted** and hide them with
`transform: translateX(100%)`, so when a slider closes nothing tells the toolbar to drop `filterOpen`, and the
fixed panel keeps painting over the app.

**Technical approach**: keep the panel exactly as-is for the inline case, but make its lifetime track the grid's
real on-screen visibility. Attach a ref to the `GridToolbar` root and, **only while the panel is open**, watch that
element with an `IntersectionObserver`; when it stops intersecting the viewport (slider translated off-screen, an
ancestor set to `display:none`, or the element removed), close the panel. Add an unmount cleanup as defense for the
truly-unmounted case. This is a single-file change in `public/src/components/CustomDataGrid.jsx` that fixes all 12
call sites with no public-API or call-site changes.

## Technical Context

**Language/Version**: JavaScript (ES2022) + JSX, React 19.2.0 (frontend SPA)

**Primary Dependencies**: `@mui/material` ^7.3.2, `@mui/x-data-grid` ^8.6.0 (peer; grid itself is custom),
`react-dom` ^19 (`createPortal`), `react-modal` ^3.16.3 (used by `SlideModalProvider`), Vite 6.4.3,
`babel-plugin-react-compiler` (React Compiler enabled). Browser `IntersectionObserver` API (baseline in all target
browsers).

**Storage**: N/A (client-side UI state only).

**Testing**: No automated frontend test runner exists (scripts: `dev`, `build`, `lint`, `preview`,
`check:compiler`, `compile`). Validation is manual in-browser per [quickstart.md](./quickstart.md), gated by
`npm run lint` and `npm run check:compiler`.

**Target Platform**: Modern evergreen browsers, desktop and mobile web; SPA served by the Express app.

**Project Type**: Web application — React SPA under `public/`, Express/Node backend at repo root.

**Performance Goals**: No perceptible overhead. The observer exists only while the Filters panel is open and
observes a single element; it adds nothing to steady-state rendering and does not touch the 300 ms slide animation.

**Constraints**: Must preserve the existing inline-grid filtering UX (open under button, re-anchor on
scroll/resize, Escape + close-button dismissal); must not change `CustomDataGrid` props or require consumer
changes; must stay React-Compiler-clean (`lint` + `check:compiler` green); fix confined to the shared component.

**Scale/Scope**: One file edited (`CustomDataGrid.jsx`, specifically the `GridToolbar` sub-component); 12
`CustomDataGrid` call sites benefit automatically; no new files in the app source.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution (`.specify/memory/constitution.md`) is an **uninitialized template** — it contains only
placeholder principles and has never been ratified. There are therefore no project-specific gates to enforce. The
plan is instead held to the template's implied baseline (simplicity, no unjustified complexity, no speculative
abstraction):

- **Simplicity / YAGNI**: PASS — single localized change using a standard browser API; no new dependency, no new
  abstraction, no refactor of the portal or the sliders.
- **Scope containment**: PASS — behaviour change is limited to "close the Filters panel when its grid is no longer
  visible"; public API and all call sites untouched.
- **No speculative work**: PASS — the broader latent issue in `SlideModalProvider` (never unmounts content) is
  documented in research as out-of-scope and is *also* covered for the grid by this fix, so no extra work is taken
  on speculatively.

**Result**: No violations. Complexity Tracking below is empty. (Re-checked after Phase 1 — still PASS; the design
adds no entities, contracts, or structure beyond the single-file behaviour change.)

## Project Structure

### Documentation (this feature)

```text
specs/013-grid-filter-modal-leak/
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 output — root-cause analysis + option comparison
├── data-model.md        # Phase 1 output — filter-panel UI state model
├── quickstart.md        # Phase 1 output — manual validation guide
├── contracts/
│   └── filter-panel-lifecycle.md   # Phase 1 output — UI behaviour contract
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
public/                                   # React SPA (frontend)
└── src/
    └── components/
        ├── CustomDataGrid.jsx            # ← THE ONLY FILE CHANGED (GridToolbar sub-component)
        ├── SlideMenu/
        │   └── SlideMenu.jsx             # slider: keeps children mounted, hides via translateX (context only)
        ├── Providers/
        │   └── SlideModalProvider.jsx    # global slide modal: never unmounts content (context only)
        └── Dashboard/WhatsApp/
            └── WhatsApp.jsx              # representative consumer: grids inside SlideMenu (context only)

routes/ models/ services/ server.js      # Express backend — NOT touched by this feature
```

**Structure Decision**: Web application. All work is in the frontend SPA under `public/src`. The change is
isolated to the `GridToolbar` sub-component inside `public/src/components/CustomDataGrid.jsx`. The slider files and
`WhatsApp.jsx` are listed only as the containers/consumers that exhibit the bug; they are **not** modified, which
keeps the fix in one shared place and avoids touching 12 call sites.

## Complexity Tracking

> No Constitution Check violations — nothing to justify.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _(none)_  | —          | —                                    |
