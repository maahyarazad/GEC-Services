# Phase 0 Research: Selectable WhatsApp Template Category (Marketing / Utility)

**Feature**: `005-twilio-template-category` | **Date**: 2026-08-31

All findings below were resolved against this repository and the vendored
`twilio@5.x` SDK typings in `node_modules/`. No `NEEDS CLARIFICATION` markers remain
in the Technical Context; the three that were open (default category, validation
strictness, scope of the grid) are resolved in R5, R6 and R9 respectively.

---

## R1 — Where the category is decided today

**Finding**: The WhatsApp approval category is hardcoded in exactly one place in the
entire codebase.

```text
routes/whatsapp_sender.js:302        category: "MARKETING",
```

A repo-wide grep for `MARKETING|UTILITY|AUTHENTICATION` across `routes/`,
`services/`, `models/` and `public/src/` returns that single line. Nothing else —
no config, no database column, no client constant — carries a category.

**Consequence**: The change surface is genuinely small. The category is a
write-once value submitted alongside the content body; it is not read back by any
send path, report, or query in this application.

**Decision**: Thread the category from the client through the request body to that
one line. Do not introduce a category concept anywhere else.

---

## R2 — Twilio Content API contract for the category

**Decision**: Keep the existing raw `fetch` to
`POST https://content.twilio.com/v1/Content/{ContentSid}/ApprovalRequests/whatsapp`
and change only the `category` value in its JSON body.

**Rationale**: The vendored SDK's own request type
(`node_modules/twilio/lib/rest/content/v1/content/approvalCreate.d.ts`) declares the
approval request body as exactly two fields:

```ts
export declare class ContentApprovalRequest {
    "name": string;      // Name of the template.
    "category": string;  // A WhatsApp recognized template category.
}
```

So `category` is a free-form string on the wire, validated by Twilio/Meta rather
than by the SDK. The route already builds this request by hand; switching to the
SDK would be a larger, unrelated refactor for no gain.

**Alternatives considered**:

- *Migrate the call to `client.content.v1.contents(sid).approvalCreate.create(...)`* —
  rejected. It changes error handling, auth (SDK client vs. the Basic header the
  route builds), and response shape for a feature that only needs one string to
  become variable.
- *Send `allow_category_change`* — rejected. The SDK's **request** type does not
  carry it; it appears only on the **response** (`ApprovalCreateResource`), so
  Twilio's Content API does not accept it as an input on this endpoint. See R4.

---

## R3 — The valid category values

**Decision**: The endpoint accepts exactly `MARKETING` and `UTILITY`.
`AUTHENTICATION` is rejected with a 400 and an explanatory message.

**Rationale**: WhatsApp recognises three template categories — `MARKETING`,
`UTILITY`, `AUTHENTICATION` — but `AUTHENTICATION` is not merely a different label.
An authentication template must be built as a `whatsapp/authentication` content
type (one-time-passcode body, `COPY_CODE` action, `add_security_recommendation`),
which `CreateTwilioTemplate.jsx` cannot produce: its type toggle offers only
`twilio/quick-reply`, `twilio/text` and `twilio/media`. Accepting `AUTHENTICATION`
would let an administrator submit a body that Meta will reject, with the failure
surfacing only asynchronously in the approval status.

The template grid already renders a `whatsapp/authentication` preview case
(`TwilioTemplateDataGrid.tsx:85`), which confirms such templates exist in the
account — they are created outside this form.

**Alternatives considered**:

- *Accept all three and let Twilio decide* — rejected. It converts a synchronous,
  explainable 400 into a silent asynchronous rejection the administrator has to
  discover by watching the approval column.
- *Add `AUTHENTICATION` plus the `whatsapp/authentication` content type* — rejected
  as out of scope. It is a separate feature (different body model, different
  variable rules); the user asked for marketing **and utility**.

---

## R4 — Meta may re-categorise a submitted template

**Finding**: The chosen category is a *request*, not a guarantee. The approval
response type carries a `category` field **and** an `allow_category_change` flag:

```ts
interface ApprovalCreateResource {
    name: string;
    category: string;
    content_type: string;
    status: string;
    rejection_reason: string;
    allow_category_change: boolean;
}
```

Meta reviews the body text and may approve the template under a different category
than the one requested (typically re-categorising a promotional body submitted as
`UTILITY` into `MARKETING`), or reject it outright.

**Decision**: Return the approval response to the client unchanged (the route
already does this via `approval: approvalRes.ok ? approvalData : { error: ... }`)
and have the client's success message name the **category Twilio echoed back**,
falling back to the requested one when the field is absent. Do not assert in the
UI that the template *is* utility.

**Rationale**: This is the only honest report the system can make, and it costs one
line. Telling an administrator "created as Utility" when Meta silently promoted it
to Marketing would misinform a billing-relevant decision.

**Alternatives considered**:

- *Ignore the echoed category and report the requested one* — rejected as
  misleading for the reason above.
- *Poll the approval status until it settles* — rejected. Approval is
  asynchronous and can take hours; the grid's existing `/api/twilio/approvals`
  column is already the mechanism for watching it.

---

## R5 — Which category is the default

**Decision**: `MARKETING` remains the default, both as the form's initial state and
as the server-side fallback when the field is absent from the request body.

**Rationale**: Two reasons, in order of weight.

1. **Backward compatibility.** Any caller that posts to
   `/api/twilio/create-template` without a `category` field must keep behaving
   exactly as it does today. Defaulting to `MARKETING` makes this change
   non-breaking by construction; defaulting to `UTILITY` would silently change the
   category — and therefore the Meta billing rate and the content rules — of every
   existing caller.
2. **It matches what this application actually sends.** The form's built-in
   defaults are the German event-invitation buttons `Teilnehmen` /
   `Nicht teilnehmen` (`CreateTwilioTemplate.jsx:25-28`). An unsolicited invitation
   to an event is marketing under Meta's definitions, not utility.

**Alternatives considered**:

- *Make the field required with no default* — rejected. It breaks existing callers
  for no safety gain, since the default is the status quo value.
- *Default to `UTILITY` because it is cheaper* — rejected. Cost is not a reason to
  mislabel content; Meta re-categorises and, on repeat offences, penalises.

---

## R6 — How strictly to validate the category against the body

**Decision**: Validate the **enum** strictly (server-side, fail closed with 400).
Do **not** attempt to validate the category against the body text. Instead show a
short, static description of each category in the form so the administrator picks
correctly.

**Rationale**: Distinguishing "your appointment is tomorrow at 3pm" (utility) from
"join us tomorrow at 3pm" (marketing) is exactly the judgement Meta's reviewers
perform, and a keyword heuristic would be wrong in both directions: it would block
legitimate utility templates and wave through promotional ones. A wrong block is
worse than a wrong send here, because the wrong send is caught by Meta's review
(R4) whereas a wrong block leaves the administrator with no way to proceed.

The enum check itself must be server-side and fail closed, matching the pattern the
route already uses for `SUPPORTED_TYPES` (`routes/whatsapp_sender.js:206-210`) and
for media URLs.

**Alternatives considered**:

- *Keyword/regex heuristic warning on save* — rejected as noise; see above.
- *Client-side enum check only* — rejected. The route is the trust boundary; the
  browser is not. This mirrors the reasoning recorded for the delete gate in
  `specs/002-twilio-template-delete/`.

---

## R7 — Content-type × category compatibility

**Finding**: All three content types the form can produce are valid under both
target categories.

| Form type | `MARKETING` | `UTILITY` |
|---|---|---|
| `twilio/text` | valid | valid |
| `twilio/media` (header image/PDF) | valid | valid |
| `twilio/quick-reply` (button actions) | valid | valid |

Quick-reply buttons and media headers are *not* marketing-only; the restriction
that does exist is the inverse one covered in R3 — `whatsapp/authentication`
content is bound to the `AUTHENTICATION` category.

**Decision**: No cross-field validation between `type` and `category` is required.
The type toggle and the category toggle are independent controls.

---

## R8 — Is the category visible after creation?

**Finding**: Yes, and it already reaches the browser today without any change.
`GET /api/twilio/approvals` (`routes/whatsapp_sender.js:320`) proxies Twilio's
`GET /v1/Content/{sid}/ApprovalRequests` and returns the whole `whatsapp` object
per SID. The grid consumes only one field of it:

```tsx
const status: string = a?.whatsapp?.status ?? 'unknown';   // TwilioTemplateDataGrid.tsx:565
```

`a?.whatsapp?.category` is present in the same payload. The SDK types it loosely —
`whatsapp: Record<string, object>` in `approvalFetch.d.ts` — so it must be read
defensively, but no server change is needed to surface it.

**Decision**: Record this as a **ready-made follow-up**, not as part of this
feature. See R9.

---

## R9 — Scope boundary

**Decision**: This feature changes two files —
`public/src/components/Dashboard/WhatsApp/CreateTwilioTemplate.jsx` and
`routes/whatsapp_sender.js` — and nothing else. Explicitly **out of scope**:

| Deferred item | Why deferred |
|---|---|
| A "Category" column in `TwilioTemplateDataGrid.tsx` | The user asked for the create form and its endpoint. The data is already available client-side (R8), so this is a self-contained ~15-line follow-up. |
| `AUTHENTICATION` category + `whatsapp/authentication` type | Separate content model; see R3. |
| Changing the category of an already-submitted template | Twilio has no such endpoint on the approval resource; it requires resubmission. |
| Storing the category in `app.db` | Nothing in the application reads a category (R1); a column with no reader is dead weight. |

**Rationale**: The one-line hardcode in R1 means the honest change is small. Padding
it with a schema column and a grid column would make the diff harder to review
without making the feature work better.

---

## R10 — Testing approach

**Finding**: `package.json` declares `"test": "echo \"Error: no test specified\" && exit 1"`.
There is no test runner, no test directory, and no test file anywhere in the
repository. This matches the finding recorded for feature 002.

**Decision**: Validation is manual, scripted in `quickstart.md`, backed by two
static checks that this repo can actually run:

- `node --check routes/whatsapp_sender.js` — syntax gate on the changed route.
- `npm run build` and `npm run lint` (from `public/`) — the client has no `tsc`
  script, and the changed file is `.jsx`, so the Vite build plus the configured
  ESLint run are the available compile gates.

**Alternatives considered**: *Introduce Jest/Vitest for this feature* — rejected.
Standing up a test harness is a project-wide decision, not a rider on a two-file
change.
