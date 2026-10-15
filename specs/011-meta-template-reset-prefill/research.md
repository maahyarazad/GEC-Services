# Phase 0 Research: Meta Template Form — Reset & Media QR Prefill

## R1 — Canonical initial form state (full reset)

**Decision**: Extract the object currently inlined in `useState(...)` into a module-level `const INITIAL_FORM = { ... }` and use it in two places: `useState(INITIAL_FORM)` and the post-success reset `setForm(INITIAL_FORM)`.

**Rationale**: Today the initial state (lines 59–68) and the post-success reset (lines 194–203) are two separately-maintained copies that have already drifted — the initial sets `media_url: '{{qr_code_url}}'` while the reset sets `media_url: ''`. A single constant guarantees "reset == fresh load" (FR-002) and kills the drift. Because `buttons` is an array of objects, `INITIAL_FORM` must hand out fresh copies on reset (e.g. `buttons: DEFAULT_BUTTONS.map(b => ({ ...b }))` built into a small factory or spread at reset) so the form never mutates the shared constant.

**Alternatives considered**:
- A `resetForm()` that sets each field individually — rejected: more code, same drift risk.
- `key`-remount of the component to reset — rejected: heavier, loses the Snackbar/submit context, and unnecessary for local state.

**Note on objects/arrays**: use a factory `makeInitialForm()` or spread the constant plus fresh `buttons`/`variable_examples` arrays to avoid sharing mutable references between renders.

## R2 — Resetting only on success, not on failure

**Decision**: Keep the reset strictly inside the `if (data.status) { ... }` success branch of `handleSubmit` (where it already lives). The error branch and `catch` do not reset.

**Rationale**: FR-003 — a failed submit must preserve the admin's input. The current structure already resets only on success; consolidating to `INITIAL_FORM` must not move the reset out of that branch.

**Alternatives considered**: Always reset in `finally` — rejected: would wipe input on error.

## R3 — Targeting the {{qr_code_url}} example field (the real design question)

**Decision**: On switching type to `twilio/media`, set the `variable_examples` entry **at the index of `qr_code_url` within the derived `templateVars` list** to `QR_SAMPLE_URL`, extending `variable_examples` if it is shorter than that index.

Because `templateVars` is built by scanning the **body first, then the media URL** (existing `useMemo`, lines 116–130), and the media URL is fixed to `{{qr_code_url}}`, `qr_code_url` is always the **last** entry in `templateVars` for a media template — its index equals the count of distinct body variables. The handler computes that index from the current body (not a hard-coded position) so it stays correct whether the body has 0, 1, or many variables.

Concretely, the type-toggle handler, when the new value is `twilio/media`:
1. Derive the body's distinct variables in order (same regex/scan as `templateVars`).
2. Let `qrIndex = bodyVars.length` (qr_code_url sits right after the body vars).
3. Build a new `variable_examples` where index `qrIndex` is `QR_SAMPLE_URL`, preserving existing entries for body-variable indices `< qrIndex` and padding with `''` if needed.

**Rationale**: FR-005 — the sample must land on the field actually labelled `{{qr_code_url}}` and must not overwrite a body variable's example. Deriving `qrIndex` from the body makes it robust to any number of body variables, matching exactly how the UI labels each example field (`templateVars[i]`).

**Alternatives considered**:
- Hard-code `variable_examples[0] = URL` — rejected: wrong whenever the body has its own variables (would clobber a body example and mis-map the QR sample).
- Re-key `variable_examples` from positional array to a `{ varName: example }` map — cleaner long-term but a larger refactor touching rendering and submit; rejected for this focused change. Documented as a future option.
- Put the QR sample in the media URL field instead of an example — rejected: the media URL is intentionally the `{{qr_code_url}}` placeholder (resolved per-recipient); the sample belongs in the example/approval value.

## R4 — Toggling Media on and off

**Decision**: Apply the prefill every time the type becomes `twilio/media`. Switching away does not strip the value (harmless: the `{{qr_code_url}}` variable no longer exists for non-media types, so that example field is not shown/submitted for them). No special teardown.

**Rationale**: Idempotent and simple; satisfies the edge cases (repeated toggling keeps a valid sample; switching away leaves body-variable examples intact). FR-004.

**Alternatives considered**: Only prefill if the QR example is empty — rejected: re-selecting Media should guarantee a valid sample even if the admin blanked it; re-applying the default is acceptable per spec.

## R5 — The sample URL as a constant

**Decision**: Add `const QR_SAMPLE_URL = 'https://services.german-emirates-club.com/qr_codes/gms-imgs-17715892355912574.png';` at module scope and reference it in the media-switch handler.

**Rationale**: One named constant keeps the magic URL discoverable and editable; mirrors how `DEFAULT_BUTTONS`, `CATEGORIES`, etc. are defined at the top of the file.

## Resolved unknowns

| Unknown | Resolution |
|---|---|
| Full reset without drift | single `INITIAL_FORM` / factory, used for mount + success reset (R1) |
| Reset only on success | keep in `data.status` branch (R2) |
| Which example field is `{{qr_code_url}}` | index = count of body variables (qr is last in `templateVars`) (R3) |
| Repeated Media toggles | re-apply prefill idempotently; no teardown (R4) |
| Where the URL lives | module-level `QR_SAMPLE_URL` constant (R5) |

No open NEEDS CLARIFICATION items remain.
