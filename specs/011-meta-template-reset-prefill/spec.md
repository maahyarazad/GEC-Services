# Feature Specification: Meta Template Form — Reset on Create & Media QR Prefill

**Feature Branch**: `011-meta-template-reset-prefill`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "on Create Meta Template on creation the whole state should be cleaned - switching to MEDIA TYPE should prefill the Example value for {{qr_code_url}} with https://services.german-emirates-club.com/qr_codes/gms-imgs-17715892355912574.png"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Form fully resets after a template is created (Priority: P1)

An admin fills in the Create Meta (WhatsApp/Twilio) Template form and submits it. On success, the entire form returns to its clean initial state so the next template starts fresh — no leftover body, buttons, variable examples, media URL, name, type, category, or language from the previous submission.

**Why this priority**: The current post-create reset is incomplete and inconsistent (it diverges from the initial state — e.g. the media URL is cleared to empty instead of its default placeholder), which leaves the form in a confusing half-populated state for the next template. A reliable full reset is the core ask.

**Independent Test**: Create a template of each type, confirm that after the success message every field is back to its initial default and no value from the submitted template remains.

**Acceptance Scenarios**:

1. **Given** a completed form that submits successfully, **When** the success message appears, **Then** every field (friendly name, language, body, variable examples, type, buttons, media URL, category) returns to its initial default value.
2. **Given** the form had been switched to Media and extra variables/buttons were added, **When** a create succeeds, **Then** those additions are gone and the form matches a freshly loaded form exactly.
3. **Given** a create **fails** (validation or server error), **When** the error message appears, **Then** the form keeps the admin's entered values (no reset) so they can correct and retry.

---

### User Story 2 - Switching to Media type prefills the {{qr_code_url}} example (Priority: P1)

A media template always sends its image via the `{{qr_code_url}}` placeholder (the media URL field is fixed to that placeholder). WhatsApp approval requires a valid sample value for every variable. When the admin switches the template type to **Media**, the example value for `{{qr_code_url}}` is prefilled with a real sample image URL instead of an unrelated default.

**Why this priority**: Without a valid sample URL for `{{qr_code_url}}`, the media template is submitted with a nonsense example (e.g. a person's name), which is wrong for an image variable and can fail/degrade Meta approval. Prefilling the correct sample is essential for media templates to be created correctly.

**Independent Test**: Switch the type toggle to Media and confirm the "Example value for {{qr_code_url}}" field shows the designated sample QR image URL.

**Acceptance Scenarios**:

1. **Given** the Create Template form, **When** the admin switches the type to Media, **Then** the example value tied to `{{qr_code_url}}` is set to `https://services.german-emirates-club.com/qr_codes/gms-imgs-17715892355912574.png`.
2. **Given** the admin switched to Media and the `{{qr_code_url}}` example was prefilled, **When** they switch away to Text only or Quick Reply, **Then** the body-variable example values are unaffected (the QR-only example applies to the media variable).
3. **Given** a media template is created with the prefilled QR sample, **When** it is submitted, **Then** the sample URL is sent as the example for `{{qr_code_url}}`.

---

### Edge Cases

- **Body also has variables**: when the body contains `{{1}}`, `{{name}}`, etc., the example fields for those remain the admin's responsibility; only the `{{qr_code_url}}` example is auto-prefilled on the Media switch, and it must land on the field actually labelled for `{{qr_code_url}}` (not overwrite a body variable's example).
- **Toggling Media on and off repeatedly**: re-selecting Media should ensure the `{{qr_code_url}}` sample is present; switching away should not corrupt the remaining example values.
- **Admin edited the QR example then re-switched**: re-entering Media may re-apply the default sample (acceptable), but must not blank out or mis-map other variables' examples.
- **Reset on failure**: a failed create must NOT wipe the form (see US1 scenario 3).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On a **successful** template creation, the form MUST reset every field to a single, canonical initial state (friendly name, language, body, variable examples, type, buttons, media URL, category).
- **FR-002**: The post-create reset state MUST be identical to the state a freshly mounted form shows (one source of truth for "initial form"; no divergent duplicate).
- **FR-003**: A **failed** create (client validation or server error) MUST NOT reset the form; entered values are preserved.
- **FR-004**: When the template type is switched to **Media**, the example value corresponding to the `{{qr_code_url}}` variable MUST be prefilled with `https://services.german-emirates-club.com/qr_codes/gms-imgs-17715892355912574.png`.
- **FR-005**: The `{{qr_code_url}}` prefill MUST populate the example field that maps to the `{{qr_code_url}}` variable specifically, without overwriting example values that belong to body variables.
- **FR-006**: The prefilled sample URL MUST be submitted as the `{{qr_code_url}}` example value when a media template is created (so it reaches WhatsApp approval).
- **FR-007**: The feature MUST change only the Create Meta Template form behaviour; the create endpoint/contract and other template types' behaviour are unchanged.

### Key Entities *(include if feature involves data)*

- **Template Form State**: the in-memory form model backing the Create Meta Template UI — friendly name, language, body, `variable_examples` (positional sample values mapped to the template's `{{...}}` variables in order of appearance), type (quick-reply / text / media), buttons, media URL, category. No persistence; this is UI state only.
- **QR Sample URL (constant)**: the fixed sample image URL used as the `{{qr_code_url}}` example for media templates.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After any successful create, 100% of form fields match the initial default (0 residual values from the submitted template).
- **SC-002**: Switching to Media sets the `{{qr_code_url}}` example to the exact designated URL in 100% of cases.
- **SC-003**: A failed create preserves 100% of entered field values (0 resets on error).
- **SC-004**: A media template created via the form carries the designated sample URL as the `{{qr_code_url}}` example in the submitted payload.

## Assumptions

- "Create Meta Template" refers to the Create Twilio/WhatsApp content-template form (`CreateTwilioTemplate.jsx`), which submits to `POST /api/twilio/create-template` for WhatsApp (Meta) approval.
- Media templates continue to use the fixed `{{qr_code_url}}` placeholder as the media URL (the media URL field remains non-editable at that placeholder).
- `variable_examples` remains a positional array; the design must ensure the QR sample maps to the `{{qr_code_url}}` field regardless of how many body variables precede it.
- The designated sample URL is a stable, publicly reachable image suitable as a WhatsApp approval sample.
- No backend or API contract change is required; this is a client-only behaviour change.
