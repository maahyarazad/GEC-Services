# Implementation Plan: Guest List Mobile Selector Modal

**Branch**: `007-guest-list-mobile-selector` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-guest-list-mobile-selector/spec.md`

## Summary

On mobile, replace the always-visible event list at the top of the Guest List panel with a compact
trigger plus a modal containing the same `EventSearch` component. This reclaims roughly 20dvh of
vertical space, which brings the guest grid's pagination bar back inside the visible viewport.
Desktop is untouched.

The existing `EventSearch` is **moved, not rewritten** — all selection, fetch, abort and redux
dispatch logic stays exactly where it is. The only change to it is making its internal list height
configurable, since the current value is tuned for the inline layout.

No API change, no schema change, no new dependency. One new piece of state (`eventModalOpen`).

## Technical Context

**Language/Version**: React 18 + Vite, JSX with incremental TSX adoption

**Primary Dependencies**: MUI (`@mui/material`), Redux Toolkit, `react-icons` — all present;
**none added**

**Storage**: N/A — no persisted state. Event selection and the guest list already live in the redux
`eventSlice`

**Testing**: No test framework is configured (`public/package.json` scripts are
`vite` / `vite build` / `eslint`; the backend `test` script is the default stub). Validation is the
manual scenario suite in `quickstart.md`, which **must be run on a real device**

**Target Platform**: Mobile browsers (iOS Safari, Android Chrome) primarily; desktop must be
unaffected

**Project Type**: Web application — React SPA in `public/`

**Performance Goals**: N/A. No change to request count or payload (SC-005)

**Constraints**: Desktop layout must be byte-for-byte equivalent; no change to guest-list data,
attendance, QR, or notepad behaviour; reuse existing components rather than adding parallel ones

**Scale/Scope**: One component modified (`GuestListPanel`), one lightly extended (`EventSearch`),
optionally two stylesheet lines. No new files strictly required

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status: NOT APPLICABLE — no ratified constitution.**

`.specify/memory/constitution.md` remains the unmodified scaffold: every principle is still a
`[PRINCIPLE_N_NAME]` placeholder and the version/ratification dates are unfilled tokens. There are
no gates to evaluate, so this check is vacuous — recording it as "PASS" would misrepresent it.
(Same finding as feature 006; running `/speckit-constitution` would fix it for all future features.)

Self-imposed gates, from conventions actually evidenced in the codebase:

| Gate | Status |
|---|---|
| Reuse existing components over new ones | PASS — `EventSearch` and MUI `Dialog` reused |
| No new runtime dependencies | PASS |
| Follow the established dialog pattern | PASS — `Dialog maxWidth="sm" fullWidth`, as used twice in this same panel |
| Do not add a fourth "mobile" breakpoint | PASS — reuses the `md` threshold the panel already uses |
| Desktop behaviour unchanged | PASS by construction — the desktop branch renders today's tree |

**Post-Phase-1 re-check**: unchanged. The design added no dependency and no new architectural layer.

## Project Structure

### Documentation (this feature)

```text
specs/007-guest-list-mobile-selector/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 — 6 findings, verified against source
├── data-model.md        # Phase 1 — UI state model (no persisted entities)
├── quickstart.md        # Phase 1 — 8 validation scenarios, real-device first
├── contracts/
│   └── ui-contract.md   # Phase 1 — component/rendering contract (no API surface)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
public/src/components/
├── CustomDataGrid.jsx                    # UNCHANGED — pagination already renders on mobile
└── Dashboard/WhatsApp/
    ├── GuestListPanel.jsx                # MODIFY — breakpoint branch, trigger, modal, state
    └── EventSearch.jsx                   # MODIFY — configurable list height + onSelected callback

public/src/components/SlideMenu/          # SEPARATELY SCOPED (see below)
├── SlideMenu.css                         # `height: 100vh` → `100dvh`  (this is the file that loads)
└── SlideMenu.scss                        # same, to keep the uncompiled source in sync
```

**Structure Decision**: Existing SPA layout. The change is confined to the two components that
render the Guest List selector. No new files are strictly required — the trigger and dialog are
small enough to live in `GuestListPanel` alongside the notepad and QR dialogs it already hosts. Add
a separate component only if the panel becomes hard to read.

## Design Decisions

Full rationale in [research.md](./research.md); the load-bearing ones:

1. **Reuse `EventSearch` inside the modal** (R2). It is imported by `GuestListPanel` and nothing
   else, so the blast radius is zero, and the `AbortController` handling, refetch-nonce effect and
   redux dispatches cannot drift because the code does not move.
2. **Breakpoint = MUI `md` (<900px)** (R4). Three conflicting thresholds already exist — 900px
   (`GuestListPanel`), 768px (`SlideMenu`), 600px (`CustomDataGrid`). `md` is the one this panel
   already uses to switch this exact layout, so no fourth threshold is introduced.
3. **`Dialog maxWidth="sm" fullWidth`, not `fullScreen`** (R5). Matches `NotepadModal` and the QR
   viewer in this same file; `fullScreen` appears nowhere in the codebase.
4. **`CustomDataGrid` unchanged** (R6). The pagination already renders on mobile — only the
   page-size select is hidden. The bug is positional, not a rendering gap.
5. **The per-event state wipe keys on redux `eid`, not on the selector's location** (data-model),
   so moving the selector into a modal cannot break the wipe.

## Concern With the Request as Specified

The requested change **does** fix the reported symptom — the arithmetic is in `research.md` R1:
reclaiming ~20dvh (~128px on a 640px viewport) comfortably covers the 30–50px shortfall.

But it treats the symptom rather than the cause. The real defect is that `.slide-menu` is sized with
`height: 100vh` — the *static* viewport height, which on mobile is taller than the visible area — so
the bottom of **every** slide panel renders behind the browser chrome. Because the inner content is
sized in fixed `dvh` units it never overflows, so `overflow-y: auto` never engages and the clipped
strip cannot be scrolled to.

Consequences of fixing only the vertical budget:
- Every other slide panel keeps the same latent bug.
- Guest List regresses the moment anything is added above the grid.

The correction is one line (`100vh` → `100dvh`), a no-op on desktop. **Two caveats**: it must be
applied to **both** `SlideMenu.css` and `SlideMenu.scss` — the `.scss` is not compiled (no `sass`
dependency; the build is plain `vite`), so editing only it produces an inert change that reviews as
correct (R3) — and it touches a stylesheet shared by all seven panels, so it wants a pass across
them before merge.

**Recommendation**: take both. The modal is the user-visible improvement and reclaims screen space
that is genuinely scarce on a phone; the `dvh` fix removes the cause. They are kept separable in
`contracts/ui-contract.md` so the second can be dropped without unpicking the first.

## Resolved Decisions

**1. Breakpoint (T001): MUI `md` — under 900px.**
Implemented as `useMediaQuery(theme.breakpoints.down('md'))` in `GuestListPanel.jsx`. This is the
same threshold the panel already uses for `flexDirection: { xs: 'column', md: 'row' }`, so the
selector and the layout always change together, and no fourth "mobile" threshold is introduced
alongside the existing 900 / 768 / 600 (`research.md` R4).

**2. The `100vh` → `100dvh` correction (T002): applied.**
Changed on the `.slide-menu` rule in **both** `SlideMenu.css` (the file that actually loads) and
`SlideMenu.scss` (the uncompiled source, kept in sync). The `.slide-menu-backdrop` rule is
deliberately left at `100vh` — an oversized fixed overlay is harmless. This removes the root cause
for all seven slide panels rather than only widening the Guest List budget (`research.md` R1/R3).

## Branching Note

This plan was written while checked out on `006-unsubscribe-contacts-list`, which has an open PR
(#67). Feature 007 should branch from `main`, not from 006, so the two are reviewable independently
— unless you want 007 stacked on 006 deliberately.

## Complexity Tracking

> No Constitution Check violations to justify — the constitution is an unfilled scaffold and the
> self-imposed gates all pass.

No entry required.
