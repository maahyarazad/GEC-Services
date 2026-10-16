# Implementation Plan: Meta Template Form — Reset on Create & Media QR Prefill

**Branch**: `011-meta-template-reset-prefill` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-meta-template-reset-prefill/spec.md`

## Summary

Two client-only behaviour changes in the Create Meta (WhatsApp/Twilio) Template form, `public/src/components/Dashboard/WhatsApp/CreateTwilioTemplate.jsx`:

1. **Full reset on create** — replace the hand-written, divergent post-success reset object with a single canonical `INITIAL_FORM` constant used both as the `useState` initial value and the post-success reset, so a successful create returns the form to exactly its fresh-load state. A failed create still leaves the form untouched.
2. **Media QR prefill** — when the type toggle switches to `twilio/media`, prefill the `variable_examples` entry that maps to the `{{qr_code_url}}` variable with the designated sample URL, so WhatsApp approval receives a valid image sample instead of an unrelated default.

No backend, API, or contract change. The create endpoint (`POST /api/twilio/create-template`) and all other template types are unchanged.

## Technical Context

**Language/Version**: React 18 + Vite (JavaScript/JSX).

**Primary Dependencies**: `@mui/material` (ToggleButtonGroup, TextField), existing `useState`/`useMemo`, project Snackbar provider. No new dependencies.

**Storage**: None — UI state only (`form` in component state). No persistence, no DB.

**Testing**: Manual validation via `quickstart.md` (no automated UI suite for admin sections; consistent with features 008–010).

**Target Platform**: Admin dashboard (browser), WhatsApp section.

**Project Type**: Web application (React frontend).

**Performance Goals**: N/A (local state updates).

**Constraints**: Must not change the submit payload contract except that the `{{qr_code_url}}` example now carries a real URL for media templates. Must preserve the existing positional `variable_examples` model and the fixed, disabled `{{qr_code_url}}` media URL field.

**Scale/Scope**: One component file. ~2 focused edits (reset + media-switch handler) plus a constant.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is an unfilled template (placeholder principles), so no ratified gates exist. Best-practice gates applied:

- **Single source of truth**: consolidating the reset into one `INITIAL_FORM` constant removes a bug-prone duplicate. ✅
- **No scope creep**: client-only; no endpoint/contract/other-type changes. ✅
- **No new dependencies / infrastructure**. ✅
- **Correctness over cleverness**: QR example targeting is derived from the existing `templateVars` ordering, not a magic index. ✅

**Result**: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/011-meta-template-reset-prefill/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (form-state model)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── form-behavior.md # UI behaviour contract (no network contract change)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
public/src/components/Dashboard/WhatsApp/
└── CreateTwilioTemplate.jsx        # MODIFIED — INITIAL_FORM constant, full reset on success,
                                    #            QR example prefill on Media switch
```

**Structure Decision**: Entirely contained in the existing `CreateTwilioTemplate.jsx`. No new files, no sibling components, no backend touch. A module-level `INITIAL_FORM` constant and a `QR_SAMPLE_URL` constant are added at the top of the file; the type-toggle `onChange` and the success branch of `handleSubmit` are the only logic edits.

## Complexity Tracking

No constitution violations; no entries.

## Phase 0 — Research

See [research.md](./research.md). Resolves: canonical initial-state design, how to reliably target the `{{qr_code_url}}` example field given the positional `variable_examples` model, and the behaviour on toggling Media on/off.

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md) — the form-state model and the `{{qr_code_url}}` variable-to-example mapping rule.
- [contracts/form-behavior.md](./contracts/form-behavior.md) — the UI behaviour contract for reset and media prefill (no network contract change).
- [quickstart.md](./quickstart.md) — manual validation scenarios.

## Post-Design Constitution Re-Check

No new services, dependencies, or contract changes; one component, two local behaviours. **Result: PASS.**
