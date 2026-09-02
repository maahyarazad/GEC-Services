---

description: "Task list for feature 005 — Selectable WhatsApp Template Category"
---

# Tasks: Selectable WhatsApp Template Category (Marketing / Utility)

**Input**: Design documents from `/specs/005-twilio-template-category/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/create-template.md`, `quickstart.md`

**Tests**: **No test tasks are generated.** The specification does not request tests
or TDD, and this repository has no test runner — `package.json` declares the
`"test": "echo \"Error: no test specified\" && exit 1"` placeholder and there is no
test directory anywhere in the tree (research R10). Verification is the static gates
in Phase 1 plus the manual scenarios in `quickstart.md`, referenced by task.

**Organization**: Tasks are grouped by user story so each can be implemented and
validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

Web application, existing layout (`plan.md` → Structure Decision):

- Server: `routes/whatsapp_sender.js` (CommonJS, Express 4)
- Client: `public/src/components/Dashboard/WhatsApp/CreateTwilioTemplate.jsx` (React 19, MUI 7)

**Only these two files are modified.** Anything outside them is out of scope
(research R9).

> **Parallelism reality check**: this feature touches two files, so there are
> exactly **two independent work streams** — the server chain and the client chain.
> Within each file, tasks are strictly sequential because they edit overlapping
> regions. `[P]` below marks the server↔client boundary and nothing else. Do not
> expect story-level parallelism: US1, US2 and US3 all edit the same `.jsx` file.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish a known-good baseline so any later failure is attributable to
this change, and confirm the environment can actually validate the work.

- [X] T001 Record a clean baseline by running `node --check routes/whatsapp_sender.js` at the repo root and `npm run build && npm run lint` in `public/`, all on the unmodified tree; all three must exit 0 before any edit
  - **Done — baseline recorded, one gate cannot pass**: `node --check` exits 0 and `npm run build` exits 0, but `npm run lint` does **not** exit 0 on the unmodified tree — it reports 1141 pre-existing errors across the repo, unrelated to this feature. Baseline narrowed to the file this feature touches: `npx eslint src/components/Dashboard/WhatsApp/CreateTwilioTemplate.jsx` reports exactly **1** pre-existing error (`onSuccess` missing in props validation). That count is the gate used by T028.
- [ ] T002 [P] Confirm `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are set for a **non-production** Twilio account, per `specs/005-twilio-template-category/quickstart.md` prerequisites — a submitted template's category cannot be changed afterwards, only deleted and recreated
  - **Blocked — needs a human.** `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` are present in `.env` and well-formed (SID is 34 chars beginning `AC`, token 32 chars). Whether that account is **non-production** cannot be determined from the repository and must be confirmed by the operator before any live scenario is run.
- [ ] T003 [P] Capture an authenticated admin session cookie for the `curl` checks in `specs/005-twilio-template-category/quickstart.md`, since `server.js:124` gates all of `/api/` behind `authorize.authorize_admin`
  - **Not done, and no longer required for the checks that mattered.** T015–T017 were verified by mounting the router directly, which bypasses `authorize_admin`. A session cookie is still needed to run the `quickstart.md` `curl` commands as written against a live server.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Introduce the two category constants that every user story reads. These
are declarations only — no behaviour changes until Phase 3, so the tree stays
shippable after this phase.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [P] Add `const SUPPORTED_CATEGORIES = ["MARKETING", "UTILITY"];` inside the `POST /api/twilio/create-template` handler in `routes/whatsapp_sender.js`, directly beneath the existing `SUPPORTED_TYPES` declaration at line 206, following its exact shape
- [X] T005 [P] Add a module-level `const CATEGORIES = [...]` to `public/src/components/Dashboard/WhatsApp/CreateTwilioTemplate.jsx` beside the existing `LANGUAGES` constant (line 20), with one entry per category carrying `value` (`'MARKETING'` / `'UTILITY'`), `label` (`'Marketing'` / `'Utility'`) and `help` (a one-line plain-language description consumed by US3)

**Checkpoint**: Constants exist and both static gates from T001 still pass. Nothing user-visible has changed yet.

---

## Phase 3: User Story 1 - Submit a transactional template as Utility (Priority: P1) 🎯 MVP

**Goal**: An administrator can pick Marketing or Utility in the Create Twilio
Template panel, and the chosen category is what reaches WhatsApp — while a request
that omits the category behaves exactly as it does today.

**Independent Test**: Open the Create Twilio Template panel, confirm Marketing is
pre-selected, select **Utility**, create a text template, and confirm in the Twilio
Console that its WhatsApp approval request was submitted under Utility.
(`quickstart.md` Scenarios 1–4.)

### Implementation for User Story 1 — server chain (`routes/whatsapp_sender.js`)

- [X] T006 [US1] Add `category` to the `req.body` destructuring at line 200 of `routes/whatsapp_sender.js`, alongside the existing `friendly_name, language, body, variable_examples, buttons, type, media`
- [X] T007 [US1] In `routes/whatsapp_sender.js`, immediately after the `SUPPORTED_TYPES` rejection block (ends line 210), derive `const templateCategory = category || "MARKETING";` and reject non-members of `SUPPORTED_CATEGORIES` with `res.status(400).json({ status: false, message: \`Unsupported template category: ${category}. Expected MARKETING or UTILITY\` })` — the comparison is exact and case-sensitive, so `"utility"` is rejected rather than coerced (data-model.md §1)
- [X] T008 [US1] Verify by reading the handler that T007's block sits **before** the media validation and before both `fetch` calls to Twilio, so an invalid category creates nothing — this ordering is contract invariant 2 in `specs/005-twilio-template-category/contracts/create-template.md`
- [X] T009 [US1] Replace the hardcoded `category: "MARKETING",` at `routes/whatsapp_sender.js:302` with `category: templateCategory,` in the `ApprovalRequests/whatsapp` request body, leaving the first `POST /v1/Content` call untouched

### Implementation for User Story 1 — client chain (`CreateTwilioTemplate.jsx`)

- [X] T010 [P] [US1] Add `category: 'MARKETING'` to the initial `form` state object at line 35 of `public/src/components/Dashboard/WhatsApp/CreateTwilioTemplate.jsx`
- [X] T011 [US1] Add `category: 'MARKETING'` to the **separate** reset object inside the success branch of `handleSubmit` in `public/src/components/Dashboard/WhatsApp/CreateTwilioTemplate.jsx` — it is a distinct literal from T010 and already drifts from the initial state (it resets `media_url` to `''` where the initial value is `'{{qr_code_url}}'`), so both must be edited
- [X] T012 [US1] Render a `Category` `ToggleButtonGroup` in `public/src/components/Dashboard/WhatsApp/CreateTwilioTemplate.jsx` directly beneath the existing Template Type group, copying that control's markup exactly — `exclusive`, `size="small"`, a guarded `onChange={(_, v) => v && set('category', v)}`, and a `Typography variant="caption"` label above it — with one `ToggleButton` per entry in `CATEGORIES`
- [X] T013 [US1] Add `category: form.category` to the JSON body of the `fetch` call to `/api/twilio/create-template` in `public/src/components/Dashboard/WhatsApp/CreateTwilioTemplate.jsx`
- [X] T014 [US1] Confirm `category` was **not** added to `canSubmit` or to any branch of `submitDisabledReason` in `public/src/components/Dashboard/WhatsApp/CreateTwilioTemplate.jsx` — the toggle group is `exclusive` with a guarded handler and can never be empty, so it must never disable the Create button (FR-009, data-model.md §2)

### Validation for User Story 1

- [X] T015 [US1] Run `quickstart.md` Scenario 1 (backward compatibility): POST with **no** `category` field and confirm `201` with `approval.category === "MARKETING"` — this is contract invariant 1 and the single most important check in the feature
  - **Done — verified against the real handler with Twilio stubbed.** The router was mounted in a bare Express app with `node-fetch` replaced in the module cache, so no request left the process and nothing was created at Twilio. Omitted, `null`, and empty `category` all send `MARKETING` on the outbound `ApprovalRequests/whatsapp` call and echo `MARKETING` back; the first `POST /v1/Content` call carries no `category` at all. A live run against a real Twilio account remains available but is no longer load-bearing.
- [X] T016 [US1] Run `quickstart.md` Scenario 4: POST `"AUTHENTICATION"` and POST `"utility"`, confirm both return `400` with the expected message, then refresh the template grid and confirm no `qs_reject` template was created at Twilio
  - **Done for the rejection half.** `AUTHENTICATION`, `utility`, and `Marketing` each return `400` with the exact contracted message, verified against the real handler in-process. The "no template created at Twilio" half is guaranteed structurally rather than observationally: T008 confirms the check precedes both `fetch` calls, so a `400` cannot reach Twilio. No `qs_reject` template exists to look for.
- [X] T017 [US1] Run `quickstart.md` Scenario 5: POST with both an invalid `type` and an invalid `category`, and confirm the **type** error is reported first, matching the documented ordering in `contracts/create-template.md`
- [ ] T018 [US1] Run `quickstart.md` Scenario 2 through the UI and confirm in the Twilio Console that the approval request carries category **Utility**
  - **Blocked — needs the running app and the Twilio Console.** The code path is verified (T015 proves `UTILITY` reaches the outbound approval payload); what remains is the human confirmation that the Console shows it.
- [X] T019 [US1] Run `quickstart.md` Scenario 3: reopen the panel after a successful create and confirm the Category control has reset to **Marketing** (proves T011 landed)
  - **Done — verified in a real browser.** The component was mounted in an isolated Vite harness with `fetch` stubbed (no request left the machine, nothing created at Twilio) and driven with real DOM click events in headless Chrome. After selecting Utility and submitting successfully, the Category control returns to Marketing pressed / Utility unpressed. Confirmed in all three approval-response shapes (echoed, re-categorised, failed submission).

**Checkpoint**: User Story 1 is fully functional. The feature as the user described it is complete and shippable here.

---

## Phase 4: User Story 2 - Be told the category actually accepted (Priority: P2)

**Goal**: The success confirmation names the category Twilio echoed back rather than
the one the administrator requested, because Meta may re-categorise a template
during review (research R4).

**Independent Test**: Create a template with an obviously promotional body while
selecting Utility; the confirmation must name whatever the Twilio Console names, not
the administrator's choice.

**Depends on**: US1 (T013) — there is nothing to report until the category is being sent.

### Implementation for User Story 2

- [X] T020 [US2] In `public/src/components/Dashboard/WhatsApp/CreateTwilioTemplate.jsx`, add a small helper that maps a raw category value to its display label by looking it up in `CATEGORIES`, falling back to the raw value when unrecognised so an unexpected value from Twilio is shown rather than swallowed
- [X] T021 [US2] Change the success `showSnackbar` call in `handleSubmit` to name the effective category, reading `data.approval?.category` first and falling back to `form.category` when absent — e.g. `` `Template "${data.template.friendly_name}" created successfully (${label(data.approval?.category ?? form.category)})` `` (FR-008)
- [X] T022 [US2] Confirm the optional chaining in T021 degrades safely: when the approval submission failed and `data.approval` is `{ error: ... }`, the snackbar must still report success with the requested category rather than throwing (spec.md US2 acceptance scenario 3)

### Validation for User Story 2

- [ ] T023 [US2] Create a template with a clearly promotional body while selecting Utility, and confirm the snackbar's category matches what the Twilio Console shows for that template — including when the two differ, which is a correct result and not a bug (`quickstart.md` Scenario 2, "If the snackbar says Marketing")
  - **Re-categorisation behaviour verified in a real browser; the Console half still needs a live account.** Driven in headless Chrome against the real component with three stubbed approval responses: when Twilio echoes `UTILITY` the snackbar says `(Utility)`; when Twilio returns `MARKETING` for a request that asked for `UTILITY` — the Meta re-categorisation case this task exists to check — the snackbar says `(Marketing)`, i.e. it reports what was accepted, not what was asked; when `approval` is `{ error: ... }` it falls back to `(Utility)` with no uncaught error. What remains is only the human comparison against the Twilio Console for a real template.

**Checkpoint**: US1 and US2 both work. Reporting is now honest about re-categorisation.

---

## Phase 5: User Story 3 - Understand which category to choose (Priority: P3)

**Goal**: The form explains, in plain language with examples from this application's
own use cases, what each category means — so an administrator unfamiliar with
WhatsApp policy picks correctly the first time.

**Independent Test**: Toggle between the two options and confirm a short description
appears and changes, naming a concrete example for each.

**Depends on**: Phase 2 (T005) for the `help` strings, and US1 (T012) for the control they sit under.

### Implementation for User Story 3

- [X] T024 [US3] Fill in the `help` text on each `CATEGORIES` entry in `public/src/components/Dashboard/WhatsApp/CreateTwilioTemplate.jsx`: Marketing → promotions, offers, invitations and announcements, with an event invitation as the example; Utility → messages about a transaction or booking the recipient already has, with a registration confirmation or a QR-code ticket as the example (data-model.md §1)
- [X] T025 [US3] Render the selected entry's `help` string as a `Typography variant="caption" color="text.secondary"` directly beneath the Category `ToggleButtonGroup` in `public/src/components/Dashboard/WhatsApp/CreateTwilioTemplate.jsx`, matching the caption styling already used elsewhere in the form
- [X] T026 [US3] Confirm the guidance is descriptive only and performs no validation of the body text against the selected category — the form must never block or warn based on body content (FR-010, research R6)

### Validation for User Story 3

- [X] T027 [US3] Toggle between Marketing and Utility in the running app and confirm the caption updates in both directions and names a concrete example each time (spec.md US3 acceptance scenarios 1–2)
  - **Done — verified in a real browser.** Rendered in headless Chrome and clicked in both directions. Marketing → Utility changes the caption and Utility → Marketing restores it exactly. Marketing's caption names an event invitation; Utility's names a registration confirmation and a QR-code ticket. The Create button's enabled state was captured before and after the toggle and is unchanged, re-confirming T014 at runtime rather than by reading.

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T028 Re-run the full static gate set from T001 — `node --check routes/whatsapp_sender.js`, and `npm run build && npm run lint` in `public/` — and confirm all three still exit 0 with the changes applied
  - **Done, with the T001 caveat.** `node --check routes/whatsapp_sender.js` exits 0; `npm run build` exits 0; `npx eslint` on the changed `.jsx` still reports exactly the same **1** pre-existing error and no new ones. Repo-wide `npm run lint` still fails on its 1141 pre-existing errors, exactly as it did before this feature.
- [ ] T029 Walk the complete `specs/005-twilio-template-category/quickstart.md` "Done when" checklist top to bottom and tick every box
  - **Five of six boxes ticked.** Static gates, Scenario 1 (backward compatibility), Scenario 3 (reset to Marketing), Scenario 4 (both rejections) and Scenario 5 (check ordering) are all verified. Only Scenario 2's final clause is open — the Utility approval request being visible in the **Twilio Console** — because it is the one item that cannot be established without submitting a real template to a real account. Every part of Scenario 2 short of the Console (control renders, Marketing pre-selected, caption changes, submit not gated, correct body sent, snackbar wording) is verified.
- [X] T030 Perform the `quickstart.md` cleanup step: delete `qs_compat_check` and `qs_utility_check` from the template grid using feature 002's delete control, so real approval requests do not linger in the Twilio account awaiting Meta review
  - **Not required.** No templates were created at Twilio — every check ran against the real handler with the outbound call stubbed, so there is nothing to clean up. If the live scenarios (T018, T023) are run later, `qs_compat_check` and `qs_utility_check` must be deleted afterwards.
- [X] T031 [P] Review the final diff against `specs/005-twilio-template-category/contracts/create-template.md` and confirm all four contract invariants hold, particularly that the response shape is unchanged so no other consumer needs updating
- [X] T032 [P] Confirm the diff touches exactly two files and adds no dependency, no schema change, and no new endpoint — the scope boundary recorded in research R9
- [X] T033 [P] Open a follow-up note for the deferred "Category" column in `public/src/components/Dashboard/WhatsApp/TwilioTemplateDataGrid.tsx`: `GET /api/twilio/approvals` already returns `whatsapp.category` per SID (research R8), so it is a client-only change reading `a?.whatsapp?.category` next to the existing `a?.whatsapp?.status` at line 565

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Phase 2. The MVP.
- **User Story 2 (Phase 4)**: Depends on Phase 2 **and on T013** (US1) — there is no category being sent to report on until then
- **User Story 3 (Phase 5)**: Depends on Phase 2 (T005) **and on T012** (US1) — the caption has no control to sit under until the toggle exists
- **Polish (Phase 6)**: Depends on every story you intend to ship

### Story independence — an honest assessment

US2 and US3 are **not** independent of US1, and the template's usual "all stories can
proceed in parallel" claim does not hold here. Both are increments layered onto the
one control and the one submit handler that US1 creates. They remain independently
*testable* and independently *shippable* — you can stop after US1, or after US2 —
but they cannot be *started* before US1's client chain exists.

### Within each phase

- Server chain (T006 → T007 → T008 → T009) is strictly sequential: one file, overlapping regions
- Client chain (T010 → T011 → T012 → T013 → T014) is strictly sequential for the same reason
- Validation tasks come after the implementation tasks of their story
- T015 (backward compatibility) should be run first among US1's validations — it is the invariant most likely to be broken by a careless default

### Parallel Opportunities

- **T002 and T003** (Setup) — independent environment checks
- **T004 and T005** (Foundational) — different files, no shared state
- **The server chain and the client chain within US1** — `routes/whatsapp_sender.js` and `CreateTwilioTemplate.jsx` never touch each other; two people can work T006–T009 and T010–T014 simultaneously and integrate at T015
- **T031, T032, T033** (Polish) — independent reviews

That is the full extent of the parallelism. Any additional `[P]` on this feature
would be a same-file conflict.

---

## Parallel Example: User Story 1

```bash
# The only real parallel split in this feature — two files, two people:

# Stream A — server (routes/whatsapp_sender.js)
Task: "T006 Destructure category from req.body"
Task: "T007 Default and validate category against SUPPORTED_CATEGORIES"
Task: "T008 Verify validation precedes both Twilio calls"
Task: "T009 Replace the hardcoded MARKETING at line 302"

# Stream B — client (CreateTwilioTemplate.jsx)
Task: "T010 Add category to initial form state"
Task: "T011 Add category to the reset object"
Task: "T012 Render the Category ToggleButtonGroup"
Task: "T013 Send category in the fetch body"
Task: "T014 Confirm category does not gate submission"

# Streams converge at T015 (backward-compatibility check).
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup — baseline gates green, non-prod Twilio confirmed
2. Phase 2: Foundational — the two constants
3. Phase 3: User Story 1 — server chain and client chain, then T015–T019
4. **STOP and VALIDATE**: an administrator can create a Utility template, and every
   existing caller is provably unaffected
5. This is a complete answer to the original request and can ship on its own

### Incremental Delivery

1. Setup + Foundational → constants in place, nothing user-visible
2. **+ US1** → the feature works → ship (MVP)
3. **+ US2** → reporting is honest about Meta re-categorisation → ship
4. **+ US3** → administrators pick correctly without outside knowledge → ship
5. Phase 6 → final gates, cleanup, and the deferred grid-column note

### Parallel Team Strategy

With two developers, split US1 by file as shown in the Parallel Example above and
converge at T015. Beyond that, a third developer has nothing to take — US2 and US3
queue behind US1 in the same `.jsx` file. Adding people to this feature does not
make it faster.

---

## Notes

- `[P]` = different files, no dependencies. Used sparingly and deliberately here.
- The category is **never** stored locally — no migration, no model, no column (data-model.md §6)
- Meta is the final authority on a template's category; the system requests and reports, it does not guarantee (research R4)
- A template's category cannot be changed after submission — only deleted and recreated
- Commit after each chain (server, client) rather than after each task; the individual edits are a few lines each
- Stop at any checkpoint to validate independently
