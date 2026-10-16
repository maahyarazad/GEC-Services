# Quickstart & Validation: Meta Template Form — Reset & Media QR Prefill

Manual validation guide. See [contracts/form-behavior.md](./contracts/form-behavior.md)
for the two behaviours and [data-model.md](./data-model.md) for the mapping rule.

## Prerequisites

- App server + frontend running; full-tier admin session.
- WhatsApp section open with the **Create Template** form
  (`CreateTwilioTemplate.jsx`) visible.
- Ability to create a template (or observe the submit payload via browser
  devtools Network tab if you want to avoid real Meta submissions).

## Scenario A — Full reset after successful create (US1)

1. Fill in a Quick Reply template: friendly name (Normalize it), a body with a
   variable `{{1}}`, add a second variable example, edit the buttons.
2. Submit and wait for the success snackbar.

**Expected**: the form returns to a fresh state — name empty, language `de`,
body empty, a single example `Hans Smith`, type Quick Reply, default buttons
(Teilnehmen / Nicht teilnehmen), media URL back to `{{qr_code_url}}`, category
Marketing. No leftover values from the submitted template.

3. Repeat starting from a **Media** template.

**Expected**: same clean reset (type back to Quick Reply, media URL back to the
default placeholder, example back to `Hans Smith`).

## Scenario B — Failed create preserves input (US1, FR-003)

1. Fill the form, then force a failure (e.g. submit with a server error, or
   temporarily point at an invalid endpoint / simulate a 4xx).

**Expected**: an error snackbar shows and **the form keeps all entered values**
(no reset).

## Scenario C — Media switch prefills {{qr_code_url}} (US2)

1. On a fresh form (body empty), switch Template Type to **Media**.

**Expected**: the example field now labelled **"Example value for {{qr_code_url}}"**
shows `https://services.german-emirates-club.com/qr_codes/gms-imgs-17715892355912574.png`.

2. Clear the body, type a body with its own variable `{{name}}`, then toggle
   Media off and on again.

**Expected**: the `{{name}}` example value is preserved; the `{{qr_code_url}}`
example is the **last** example field and holds the sample URL — it did not
overwrite the `{{name}}` example.

3. With a Media template prefilled, switch the type to **Text only** (or Quick
   Reply).

**Expected**: the QR sample example is **removed** (reverted); body-variable
examples remain. Switching between Text and Quick Reply does not change the
example list.

## Scenario D — Sample URL reaches the payload (US2, FR-006)

1. With a Media template prefilled per Scenario C, open devtools Network, submit.

**Expected**: the request body's `variable_examples` includes the sample URL
`...gms-imgs-17715892355912574.png` as the entry for `{{qr_code_url}}`.

## Pass criteria

- [ ] Scenario A: full reset on success for both Quick Reply and Media.
- [ ] Scenario B: no reset on failure.
- [ ] Scenario C: `{{qr_code_url}}` example prefilled on Media switch, body
      examples preserved.
- [ ] Scenario D: sample URL present in the submitted `variable_examples`.
