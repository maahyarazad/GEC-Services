# Phase 1 Data Model: Meta Template Form State

No persisted entities, no schema, no DB. This feature operates on the Create
Meta Template component's local React state. Documented here for precision.

## Entity: Template Form State (`form`)

In-memory state in `CreateTwilioTemplate.jsx`. Fields and their initial values
(the canonical `INITIAL_FORM`):

| Field | Type | Initial value | Notes |
|---|---|---|---|
| `friendly_name` | string | `''` | Slugified name. |
| `language` | string | `'de'` | `en` or `de`. |
| `body` | string | `''` | May contain `{{...}}` variables. |
| `variable_examples` | string[] | `['Hans Smith']` | Positional sample values; index *i* maps to `templateVars[i]`. |
| `type` | string | `'twilio/quick-reply'` | `twilio/quick-reply` \| `twilio/text` \| `twilio/media`. |
| `buttons` | {title,id}[] | `DEFAULT_BUTTONS` (fresh copies) | Quick-reply only. |
| `media_url` | string | `'{{qr_code_url}}'` | Fixed/disabled placeholder for media templates. |
| `category` | string | `'MARKETING'` | `MARKETING` \| `UTILITY`. |

**Reset rule (FR-001/FR-002)**: after a successful create, `form` is set back to
`INITIAL_FORM` with fresh array/object copies (`buttons`, `variable_examples`),
identical to the mount state. On failure, `form` is unchanged (FR-003).

## Derived: `templateVars` (existing `useMemo`)

Ordered list of distinct `{{...}}` variable names, scanned **body first, then
`media_url` when type is media**. Drives the example field labels
(`Example value for {{templateVars[i]}}`).

- For a **media** template, `{{qr_code_url}}` (from the fixed `media_url`) is
  always the **last** entry → its index = number of distinct body variables.

## Mapping rule: Media switch → `{{qr_code_url}}` example (FR-004/FR-005)

Constant: `QR_SAMPLE_URL = "https://services.german-emirates-club.com/qr_codes/gms-imgs-17715892355912574.png"`.

<<<<<<< HEAD
When `type` becomes `twilio/media` — QR is appended as the **last** example:

```
bodyVars = distinct {{...}} names in form.body, in order
examples = form.variable_examples.slice(0, bodyVars.length)  # keep body-var examples, drop trailing junk
pad examples with '' up to bodyVars.length
examples.push(QR_SAMPLE_URL)                                 # qr_code_url is the last templateVar
form.variable_examples = examples
```

- Body-variable example values (the first `bodyVars.length` entries) are preserved.
- QR is always the final entry, aligned to the `{{qr_code_url}}` slot.

When `type` leaves `twilio/media` (→ text / quick-reply) — revert:

```
examples = form.variable_examples.filter(v => v !== QR_SAMPLE_URL)  # drop the preset
form.variable_examples = examples.length ? examples : ['Hans Smith']
```

- The QR preset is removed; body-variable examples remain.
- Switching between two non-media types leaves `variable_examples` untouched.
=======
When `type` becomes `twilio/media`:

```
bodyVars  = distinct {{...}} names in form.body, in order
qrIndex   = bodyVars.length           # qr_code_url is appended after body vars
examples  = clone(form.variable_examples)
pad examples with '' up to qrIndex
examples[qrIndex] = QR_SAMPLE_URL
form.variable_examples = examples
```

- Entries at indices `< qrIndex` (body variables' examples) are preserved.
- If `variable_examples` was shorter than `qrIndex`, missing slots are padded
  with `''` so the QR sample lands on the correct (qr) index.
>>>>>>> 549a1d27d (Reset Create Meta Template form on create; prefill QR example on Media)

## Submit mapping (unchanged contract)

`handleSubmit` still sends `variable_examples: form.variable_examples.map(trim).filter(Boolean)`.
With the prefill, the media template's payload now includes `QR_SAMPLE_URL` as
the `{{qr_code_url}}` example (FR-006). No payload field is added or renamed.
