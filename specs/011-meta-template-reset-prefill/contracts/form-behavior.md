# UI Behaviour Contract: Create Meta Template Form

This feature changes **client behaviour only**. The network contract with
`POST /api/twilio/create-template` is unchanged (same fields, same shapes); the
only observable payload difference is that a media template's `variable_examples`
now carries a real sample URL for `{{qr_code_url}}`.

Component: `public/src/components/Dashboard/WhatsApp/CreateTwilioTemplate.jsx`.

## Behaviour 1 — Full reset on successful create

**Trigger**: `handleSubmit` receives a response with `data.status === true`.

**Contract**:
- After the success snackbar and `onSuccess?.()`, `form` is set to the canonical
  initial state (`INITIAL_FORM`) with fresh `buttons` and `variable_examples`
  arrays.
- Post-reset, every field equals its mount-time default:
  `friendly_name=''`, `language='de'`, `body=''`,
  `variable_examples=['Hans Smith']`, `type='twilio/quick-reply'`,
  `buttons=DEFAULT_BUTTONS`, `media_url='{{qr_code_url}}'`, `category='MARKETING'`.
- The reset state is produced from the **same** source as the `useState`
  initial value (no second, divergent object).

**Non-trigger**:
- `data.status === false` (server rejects) → **no reset**; `form` keeps entered values.
- Network/exception (`catch`) → **no reset**.

## Behaviour 2 — Media type prefills {{qr_code_url}} example

**Trigger**: the Template Type toggle changes to `twilio/media`.

**Contract**:
- `QR_SAMPLE_URL` (`https://services.german-emirates-club.com/qr_codes/gms-imgs-17715892355912574.png`)
  is appended as the **last** entry of `variable_examples`, aligned to the
  `{{qr_code_url}}` slot (qr_code_url is the last `templateVars` entry for media,
  since body variables are scanned first).
- Example values for the body's variables are **preserved**; `variable_examples`
  is first trimmed/padded to the body-variable count so the sample lands on the
  qr slot (the last field), never overwriting a body variable's example.
- The field labelled **"Example value for {{qr_code_url}}"** (the last example
  field) shows the sample URL.

**Reverting away from Media**:
- Switching from Media to `twilio/text` or `twilio/quick-reply` **removes** the
  QR preset from `variable_examples` (the sample is dropped). Body-variable
  examples remain; if the list would be empty, it falls back to the default
  single example `['Hans Smith']`.

**Idempotency / toggles**:
- Selecting Media again re-appends the sample as the last item.
- Switching between two non-media types does not touch `variable_examples`.

## Unchanged

- The media URL field stays fixed/disabled at `{{qr_code_url}}`.
- Submit payload structure, endpoint, validation gating, and all other template
  types behave exactly as before.
