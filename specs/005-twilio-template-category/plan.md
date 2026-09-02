# Implementation Plan: Selectable WhatsApp Template Category (Marketing / Utility)

**Branch**: `005-twilio-template-category` | **Date**: 2026-08-31 | **Spec**: _none — see "Missing specification" below_

**Input**: User description: "upgrade the CreateTwilioTemplate and the corresponding end point to handle both marketing and utility"

## Missing specification

There is no `specs/005-twilio-template-category/spec.md`. `/speckit-plan` normally
reads one, and this plan was written directly from the user description plus the
codebase instead. The feature is small and unambiguous enough that this is
workable, but the acceptance criteria in `quickstart.md` are **derived**, not
agreed. Run `/speckit-specify` against the same description first if you want the
scope boundaries in research R9 ratified before `/speckit-tasks`.

(This is not unprecedented here — `specs/004-kb-video-streaming-ticket/` also has
no `spec.md`.)

## Summary

The WhatsApp approval category is hardcoded to `MARKETING` at exactly one place in
the codebase — `routes/whatsapp_sender.js:302` — so every template this application
creates is submitted to Meta as marketing, including transactional ones like ticket
delivery and registration confirmations. That is both a compliance mislabel and a
cost one, since Meta prices utility conversations below marketing.

Technical approach: make the category a first-class, administrator-chosen input. A
new `Category` toggle group in `CreateTwilioTemplate.jsx` — sitting beside the
existing Template Type toggle, defaulting to **Marketing** — sends an optional
`category` field on the existing `POST /api/twilio/create-template` request. The
route defaults it to `"MARKETING"` when absent, validates it against a two-member
enum with the same fail-closed shape as the existing `SUPPORTED_TYPES` check, and
forwards it to Twilio's approval call in place of the literal. On success the
client reports the category **Twilio echoed back** rather than the one it asked
for, because Meta may re-categorise the template during review.

Two files change. No schema change, no new dependency, no new endpoint, no change
to the response shape.

## Technical Context

**Language/Version**: Node.js 20 (CommonJS) server; React 19 + Vite 6 client (`public/`)

**Primary Dependencies**: Express 4.21, `twilio@5.x` (present, but this route calls the Content REST API directly via `node-fetch`), MUI 7, `react-icons`

**Storage**: SQLite (`app.db`) via `services/dbService.js` — **not touched**. Templates and their approval categories live at Twilio.

**Testing**: No test runner (`package.json` `test` script is the `exit 1` placeholder). Validation is `node --check` + the client build/lint + the manual pass in `quickstart.md`.

**Target Platform**: Web admin dashboard served by the same Express process

**Project Type**: Web application (Express backend + Vite/React frontend under `public/`)

**Performance Goals**: No change. The added work is one string comparison; request latency stays bounded by the two Twilio round-trips the route already makes.

**Constraints**: Must be backward compatible — a request without `category` has to behave exactly as it does today. Validation must be server-side and must run before any Twilio call, so a rejected request cannot orphan a content resource. Meta may override the requested category; the UI must not claim otherwise.

**Scale/Scope**: 2 files changed, ~40 lines. 1 endpoint amended, 0 added. Template list capped at 100 by the existing `contents.list({ limit: 100 })`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is **an unmodified template** — every principle is
still a `[PRINCIPLE_N_NAME]` / `[PRINCIPLE_N_DESCRIPTION]` placeholder, and the
governance and version fields are unfilled.

**Result**: No enforceable gates exist. Recorded as a non-blocking finding, not a
pass. Nothing in this plan can be checked against project principles until the
constitution is filled in via `/speckit-constitution`.

Applied in place of formal gates, the conventions this codebase already
demonstrates:

| Convention (observed) | How this plan complies |
|---|---|
| Admin endpoints live under `/api/` and inherit `authorize_admin` (`server.js:124`) | No new endpoint; the amended one is already covered |
| Validation of client-supplied enums is server-side and fails closed (`SUPPORTED_TYPES`, `routes/whatsapp_sender.js:206-210`) | The category check is the same shape, in the same handler, immediately after it |
| Trust boundary is the route, not the browser | The toggle group is a convenience; the route is the authority and rejects anything else |
| Additive API changes stay backward compatible | `category` is optional and defaults to today's hardcoded value |
| Errors are returned as `{ status: false, message }` with a specific message | The new `400` follows that shape verbatim |
| No new dependencies for small features (feature 002 held this line) | None added |

**Post-Phase 1 re-check**: unchanged. The design adds no dependency, no auth
surface, no schema change, and no new endpoint. Still no constitution to check
against.

## Project Structure

### Documentation (this feature)

```text
specs/005-twilio-template-category/
├── plan.md                      # This file
├── research.md                  # Phase 0 output — R1..R10
├── data-model.md                # Phase 1 output — the category enum + payload shapes
├── quickstart.md                # Phase 1 output — 5 validation scenarios
├── contracts/
│   └── create-template.md       # Phase 1 output — amended endpoint contract
└── tasks.md                     # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
routes/
└── whatsapp_sender.js                     # MODIFY: read + default + validate `category`;
                                           #   replace the hardcoded "MARKETING" at line 302

public/src/components/Dashboard/WhatsApp/
└── CreateTwilioTemplate.jsx               # MODIFY: + category in form state and reset,
                                           #   + Category ToggleButtonGroup with helper text,
                                           #   + send category, + report the echoed category
```

Unchanged and deliberately so — see research R9:

```text
public/src/components/Dashboard/WhatsApp/
├── TwilioTemplateDataGrid.tsx             # A "Category" column is a follow-up, not this feature
└── WhatsApp.jsx                           # Existing onSuccess wiring (line 1335) already suffices
services/whatsAppSender.js                 # Sending is category-independent
create_tables.sql / app.db                 # No schema change
```

**Structure Decision**: Web application, existing layout. The server half lands in
`routes/whatsapp_sender.js` because that is where the create-template handler and
its sibling validations already live; extracting a service function for a single
string comparison would add a file without adding a seam. The client half stays
inside `CreateTwilioTemplate.jsx` for the same reason — the category is form state,
not shared state.

## Implementation outline

Not tasks (that is `/speckit-tasks`), but the shape the two edits take.

### Server — `routes/whatsapp_sender.js`

1. Destructure `category` from `req.body` alongside the existing fields (line ~200).
2. Immediately after the `SUPPORTED_TYPES` block (line ~210), add the mirror-image
   check:
   - `const SUPPORTED_CATEGORIES = ["MARKETING", "UTILITY"];`
   - `const templateCategory = category || "MARKETING";`
   - reject with `400` and
     `Unsupported template category: ${category}. Expected MARKETING or UTILITY`
     when not a member.
3. At line 302, replace `category: "MARKETING"` with `category: templateCategory`.

Placing step 2 before the media validation and both Twilio calls is what makes
contract invariant 2 ("an invalid category creates nothing") true.

### Client — `CreateTwilioTemplate.jsx`

1. Add `const CATEGORIES = [...]` beside the existing `LANGUAGES` constant, each
   entry carrying `value`, `label`, and a one-line `help` string.
2. Add `category: 'MARKETING'` to the initial `form` state **and** to the reset
   object inside the success branch — they are separate literals and already drift
   (`media_url`), so both need editing.
3. Render a `ToggleButtonGroup` for the category directly beneath the Template Type
   group, following that control's exact markup, with the selected entry's `help`
   text rendered as a `Typography variant="caption"` below it.
4. Include `category: form.category` in the `fetch` body.
5. Change the success snackbar to name the effective category:
   `` `Template "${data.template.friendly_name}" created successfully (${label(data.approval?.category ?? form.category)})` ``
   — reading the echoed value first, per research R4.

`category` must **not** be added to `canSubmit` or `submitDisabledReason`; the
toggle group is `exclusive` with a guarded `onChange`, so it cannot be empty.

## Risks

| Risk | Mitigation |
|---|---|
| An administrator picks Utility for promotional content; Meta re-categorises or rejects | Unpreventable in software (research R6). Mitigated by per-option helper text in the form and by reporting the echoed category rather than the requested one. |
| A submitted template's category cannot be changed afterwards | Out of scope by necessity — Twilio offers no such endpoint. The remedy is delete (feature 002) and recreate. Called out in `quickstart.md`'s prerequisites. |
| The client reads `approval.category` from a payload the SDK types as `Record<string, object>` | Read optionally with a fallback to the requested value; a missing field degrades to today's message, not a crash. |
| Validation added in the wrong place would let a `400` still create a Twilio content resource | Step 2 is explicitly ordered before both Twilio calls; Scenario 4 in `quickstart.md` asserts nothing leaks. |

## Complexity Tracking

> Fill ONLY if Constitution Check has violations that must be justified

No violations to justify — there is no constitution to violate (see Constitution
Check), and the design adds no dependency, abstraction, or component beyond the two
files the feature description names.
