# Tasks: Event Template Dropdown (web_events)

**Feature**: `010-event-template-dropdown` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

**Inputs**: plan.md, spec.md, research.md, data-model.md, contracts/web-events-api.md, quickstart.md

**Tests**: Not requested (project has no automated UI/integration suite for admin sections; validation is manual via quickstart.md). No test tasks are generated.

**Conventions**: `[P]` = parallelizable (different file, no incomplete dependency). Story labels `[US1]`/`[US2]` map to the user stories in spec.md. Paths are repo-relative.

---

## Phase 1: Setup

- [X] T001 Confirm the physical `web_events` column names against the live MySQL schema (run `SHOW COLUMNS FROM web_events;` using the credentials in `services/mysqlService.js`) and record the id/title/description/date column names in `specs/010-event-template-dropdown/research.md` (R3) so the SELECT aliases in Phase 2 are correct.

---

## Phase 2: Foundational (blocking prerequisite for all user stories)

**Purpose**: The read-only MySQL endpoint that both user stories consume. No story can function until this returns template data.

- [X] T002 Add `const { getPool } = require("../services/mysqlService");` to the require block in `routes/events.js` (reuse the existing singleton pool; do not create a new service).
- [X] T003 Implement `GET /api/web-events` in `routes/events.js` per `contracts/web-events-api.md`: `const pool = getPool();` then `const [rows] = await pool.query("SELECT id, title, description, event_date AS eventDate FROM web_events ORDER BY event_date DESC")`, mapping null `description` to `""`; respond `res.json({ status: true, data: rows })`. Adjust column aliases to the names confirmed in T001. (Route is auto-guarded by the existing `/api/` chokepoint — do not add auth here.)
- [X] T004 Add a `try/catch` to the handler that logs `console.error(\`${Date.now()} - Error in GET /api/web-events:\`, error)` and returns `res.status(500).json({ status: false, message: "Server error" })`, matching the other handlers in `routes/events.js`.

**Checkpoint**: `curl --cookie <admin> $VITE_SERVERURL/api/web-events` returns `{status:true,data:[...]}` (quickstart Step 1); no cookie returns 401/403 (Step 2).

---

## Phase 3: User Story 1 — Pre-fill a new event from a web_events template (Priority: P1) 🎯 MVP

**Goal**: In the Create New Event modal, a dropdown lists `web_events` titles; selecting one seeds Title, Description, and Event Date & Time.

**Independent Test**: Open Create New Event, pick a title, confirm the three fields fill with that row's values (quickstart Steps 3–5).

- [X] T005 [US1] In `public/src/components/Sections/EventSection.jsx`, add state for templates and load them: `const [templates, setTemplates] = useState([])` plus a `fetchTemplates` callback that GETs `${import.meta.env.VITE_SERVERURL}/api/web-events` with `credentials: "include"`, sets `templates` to `json.data || []`, and on error/non-ok sets `[]` (non-blocking — never throws to the UI). Invoke it on mount via `useEffect`.
- [X] T006 [P] [US1] In the same file, add a date-normalisation helper that converts a raw `web_events` date to the `datetime-local` format, reusing the existing `openEdit` approach (`value ? new Date(value).toISOString().slice(0,16) : ''`) and returning `''` for an invalid/absent date.
- [X] T007 [US1] Import MUI `Autocomplete` and render it inside the Create/Edit modal's `DialogContent` in `EventSection.jsx`, above the Title field: `options={templates}`, `getOptionLabel={(o) => o.title || ''}`, `isOptionEqualToValue={(o, v) => o.id === v.id}`, label "Load from web event", `size="small"`, `fullWidth`. Keep the control value uncontrolled/local (it only seeds the form).
- [X] T008 [US1] Implement the `onChange` handler for the Autocomplete in `EventSection.jsx`: on a selected option, `setFormData((prev) => ({ ...prev, title: opt.title || '', description: opt.description || '', event_date: normalizeDate(opt.eventDate) }))` (preserving `prev.id` for edit mode) and clear any related `formErrors`. On clear (null), leave the current form values untouched.
- [X] T009 [US1] Verify the seeded fields stay editable and Save still posts to the existing `POST /api/events` flow unchanged (no edits to `handleSave`); confirm the success snackbar + grid refresh path still runs.

**Checkpoint**: Quickstart Steps 3–5 pass — dropdown lists titles only, selection pre-fills all three fields with the date rendering correctly, edits persist on Save.

---

## Phase 4: User Story 2 — Reuse the dropdown when editing an event (Priority: P3)

**Goal**: The same dropdown re-seeds fields in Edit mode while preserving the event `id`.

**Independent Test**: Open an existing event via Edit, select a template, confirm fields are overwritten and Save updates that event (quickstart Step 6).

- [X] T010 [US2] In `EventSection.jsx`, confirm the Autocomplete from T007 renders in both `create` and `edit` `modalMode` (it lives in the shared Dialog, so no second control is needed) and that the `onChange` from T008 spreads over `prev` so `formData.id` set by `openEdit` is preserved when a template re-seeds the other fields.
- [X] T011 [US2] Verify Edit-mode save still uses `PUT /api/events` with the preserved `id` and the re-seeded (possibly edited) field values; no change to `handleSave` required.

**Checkpoint**: Quickstart Step 6 passes — template re-seed in Edit mode updates the existing event by `id`.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T012 [P] Handle the empty/error template state in `EventSection.jsx`: when `templates` is empty show a "No templates available" `noOptionsText` on the Autocomplete; ensure the modal, all fields, and Save remain fully usable (quickstart Step 7 — MySQL down / empty table).
- [X] T013 [P] Confirm null `description`/`eventDate` from a web event seed empty fields (not the literal string "null") and that required-field validation (`title`, `event_date`) still fires on Save.
- [ ] T014 Run the full `quickstart.md` (Steps 0–7) against a running server with a full-tier admin session and tick the Pass criteria; note any `web_events` column-name adjustment made in T001/T003.

---

## Dependencies & Execution Order

- **Phase 1 (T001)** → informs **Phase 2 (T003)** column aliases. Do T001 first.
- **Phase 2 (T002–T004)** is a hard prerequisite for all stories (provides the data). Complete before Phase 3.
- **Phase 3 (US1, T005–T009)** is the MVP. T005 (fetch) and T007 (render) precede T008 (seeding); T006 can run in parallel with T005/T007.
- **Phase 4 (US2, T010–T011)** depends on US1 (shared modal + onChange already built); it is largely verification.
- **Phase 5 (T012–T014)** after the stories; T012 and T013 are independent `[P]`, T014 is the final manual pass.

### Story completion order

```
Setup (T001)
   └─> Foundational endpoint (T002–T004)
          └─> US1 / MVP (T005–T009)
                 └─> US2 (T010–T011)
                        └─> Polish (T012–T014)
```

## Parallel Opportunities

- **Within US1**: T006 (date helper) ‖ T005 (fetch) and T007 (render scaffold) — different concerns in the same file; coordinate the single-file edits but logic is independent.
- **Polish**: T012 ‖ T013 (different edge-case paths).
- Phases 2 and 3 cannot overlap (frontend needs the endpoint shape); within a phase, follow the ordering above.

## Implementation Strategy

- **MVP = Phases 1–3** (T001–T009): delivers the entire core ask — a titles dropdown in Create New Event that pre-fills title/description/date. Shippable on its own.
- **Increment 2 = Phase 4** (US2): extends the same control to Edit mode (low cost, shared modal).
- **Increment 3 = Phase 5**: hardens edge cases and runs the quickstart sign-off.
