# Tasks: Meta Template Form — Reset on Create & Media QR Prefill

**Feature**: `011-meta-template-reset-prefill` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

**Inputs**: plan.md, spec.md, research.md, data-model.md, contracts/form-behavior.md, quickstart.md

**Tests**: Not requested (no automated UI suite for admin sections; validation is manual via quickstart.md). No test tasks generated.

**Scope note**: All changes are in a single file — `public/src/components/Dashboard/WhatsApp/CreateTwilioTemplate.jsx`. Because both user stories edit this one file, their tasks are sequential (no cross-story `[P]`), though they are logically independent increments.

**Conventions**: `[P]` = parallelizable (different file / no incomplete dependency). Story labels `[US1]`/`[US2]` map to spec.md. Paths are repo-relative.

---

## Phase 1: Setup

- [X] T001 Add module-level constants to `public/src/components/Dashboard/WhatsApp/CreateTwilioTemplate.jsx`: `QR_SAMPLE_URL = 'https://services.german-emirates-club.com/qr_codes/gms-imgs-17715892355912574.png'` and an initial-form factory `makeInitialForm()` returning the canonical form object (friendly_name '', language 'de', body '', variable_examples ['Hans Smith'], type 'twilio/quick-reply', buttons `DEFAULT_BUTTONS.map(b => ({ ...b }))`, media_url '{{qr_code_url}}', category 'MARKETING') — placed near the existing `DEFAULT_BUTTONS`/`CATEGORIES` constants.

---

## Phase 2: Foundational (blocking prerequisite for all user stories)

**Purpose**: Make the component use the single canonical initial state so both the reset (US1) and any subsequent edits build on one source of truth.

- [X] T002 In `CreateTwilioTemplate.jsx`, change the `useState` initializer from the inline object to `useState(makeInitialForm())` so the mount state comes from the Phase 1 factory (no behavior change at mount; removes the first of the two divergent copies).

**Checkpoint**: Form still mounts with identical defaults; `makeInitialForm()` is the sole initial-state definition.

---

## Phase 3: User Story 1 — Full reset after successful create (Priority: P1) 🎯 MVP

**Goal**: A successful create returns every field to the canonical initial state; a failed create leaves input intact.

**Independent Test**: Create a template (Quick Reply and Media), confirm all fields reset to defaults on success; force a failure and confirm no reset (quickstart Scenarios A & B).

- [X] T003 [US1] In `handleSubmit`'s success branch (`if (data.status)`) in `CreateTwilioTemplate.jsx`, replace the hand-written reset object with `setForm(makeInitialForm())`, keeping the reset inside the success branch only (after `showSnackbar` + `onSuccess?.()`).
- [X] T004 [US1] Verify the failure paths are untouched: the `else` branch (`data.status === false`) and the `catch` do NOT call `setForm`, so a failed create preserves entered values (FR-003). No code change expected — confirm and adjust only if a stray reset exists.

**Checkpoint**: Quickstart Scenario A (reset on success for Quick Reply and Media) and Scenario B (no reset on failure) pass.

---

## Phase 4: User Story 2 — Media switch prefills {{qr_code_url}} example (Priority: P1)

**Goal**: Switching type to Media prefills the `{{qr_code_url}}` example with `QR_SAMPLE_URL` at the correct index, preserving body-variable examples.

**Independent Test**: Switch type to Media (empty body, and body-with-variable cases) and confirm the "Example value for {{qr_code_url}}" field holds the sample URL without clobbering other examples (quickstart Scenario C).

- [X] T005 [US2] In `CreateTwilioTemplate.jsx`, add a `handleTypeChange(newType)` helper (or inline logic in the Template Type `ToggleButtonGroup` `onChange`) that sets `type`, and when `newType === 'twilio/media'` computes `qrIndex` = count of distinct `{{...}}` variables in `form.body` (same regex/scan as the `templateVars` useMemo), clones `variable_examples`, pads with `''` up to `qrIndex`, and sets index `qrIndex` to `QR_SAMPLE_URL` — preserving existing body-variable example entries (indices `< qrIndex`).
- [X] T006 [US2] Wire the Template Type `ToggleButtonGroup` `onChange` in `CreateTwilioTemplate.jsx` to the handler from T005 (replacing the current `(_, v) => v && set('type', v)`), guarding against the null value ToggleButtonGroup emits on deselect (only act when `v` is truthy).

**Checkpoint**: Quickstart Scenario C passes — `{{qr_code_url}}` example prefilled on Media switch with body examples preserved across toggles.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T007 [P] Confirm the submit payload for a Media template includes `QR_SAMPLE_URL` as the `{{qr_code_url}}` example in `variable_examples` (quickstart Scenario D) — no code change expected since `handleSubmit` already maps `variable_examples`; verify via devtools Network.
- [X] T008 [P] Confirm no regressions in `CreateTwilioTemplate.jsx`: the media URL field stays fixed/disabled at `{{qr_code_url}}`, example field labels still derive from `templateVars`, and Quick Reply / Text templates are unaffected by the type-change handler.
- [ ] T009 Run the full `quickstart.md` (Scenarios A–D) against a running server with a full-tier admin session and tick the Pass criteria.

---

## Dependencies & Execution Order

- **Phase 1 (T001)** → **Phase 2 (T002)** → stories. The factory/constant must exist before `useState` and the reset use them.
- **Phase 3 (US1)** depends on T001–T002 (uses `makeInitialForm`).
- **Phase 4 (US2)** depends on T001 (uses `QR_SAMPLE_URL`) and the `templateVars` scan pattern; independent of US1's reset logic but edits the same file, so sequence after US1.
- **Phase 5** after both stories; T007 and T008 are independent `[P]` verifications, T009 is the final manual pass.

### Story completion order

```
Setup (T001)
   └─> Foundational useState (T002)
          ├─> US1 / MVP reset (T003–T004)
          └─> US2 media prefill (T005–T006)
                 └─> Polish (T007–T009)
```

## Parallel Opportunities

- Single-file feature: in-file tasks are sequential to avoid edit conflicts.
- Polish verifications T007 ‖ T008 (independent read-only checks).

## Implementation Strategy

- **MVP = Phases 1–3** (T001–T004): canonical initial state + reliable full reset on success. Shippable on its own.
- **Increment 2 = Phase 4** (US2): Media `{{qr_code_url}}` prefill.
- **Increment 3 = Phase 5**: payload/regression verification + quickstart sign-off.
