---
description: "Task list for Admin Knowledge Base implementation"
---

# Tasks: Admin Knowledge Base

**Input**: Design documents from `/specs/001-admin-knowledge-base/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/knowledge-base-api.md, quickstart.md

**Tests**: No automated test tasks are generated. The spec does not request TDD, and research R8 records
why: root `package.json:7` is the default failing stub and the client has no test runner. Verification
is manual, against `quickstart.md`, and each story phase ends with an explicit verification task.

**Organization**: Grouped by user story so each is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete work)
- **[Story]**: US1 / US2 / US3, mapping to the prioritized stories in spec.md
- Exact file paths are given in every task

## Path Conventions

Web application, per plan.md: Express server at the repository root (`routes/`, `services/`,
`middleware/`, `server.js`), Vite React SPA under `public/`. No new npm dependency on either side.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the empty scaffolding the rest of the work drops into.

- [X] T001 Create the feature directory `public/src/components/Dashboard/KnowledgeBase/`
- [X] T002 [P] Create the recordings directory `file_storage/knowledge_base/` and add `file_storage/knowledge_base/*` to `.gitignore` — per data-model.md §3, recordings are placed on the server by hand and are never committed
- [X] T003 [P] Create `public/src/components/Dashboard/KnowledgeBase/KnowledgeBase.scss` with an empty section shell, matching the `.scss` + compiled `.css` convention used by sibling sections such as `public/src/components/Dashboard/PDFGenerator/PDFGenerator.scss`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The catalogue data and the navigable section shell. Every user story reads the catalogue
and renders inside this shell.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Create `public/src/components/Dashboard/KnowledgeBase/knowledgeBase.catalog.js` exporting a frozen array of all 6 top-level topics and the 4 WhatsApp sub-topics, with the exact `id`, `title`, `summary`, `sectionSlug`, `destination`, `video`, `durationLabel`, `order`, and `subTopics` fields defined in data-model.md §1, and the id → destination mapping in its launch-content table
- [X] T005 Add a `{ icon: <MdMenuBook size={20} />, label: "Knowledge Base" }` entry to the `tabConfig` array in `public/src/components/Dashboard/Dashboard.jsx` (currently ends at index 11, "Support Center", around line 281), importing the icon from `react-icons/md` alongside the existing `Md*` imports at line 26 — the `knowledge-base` slug is derived automatically by `slugify` at line 311
- [X] T006 Add a `React.lazy(() => import("./KnowledgeBase/KnowledgeBase"))` declaration beside the existing lazy imports (lines 37-47) and a `case 12: content = <KnowledgeBase />; break;` to the `switch (tabValue)` block in `public/src/components/Dashboard/Dashboard.jsx` (same file as T005 — do not parallelize)
- [X] T007 Create `public/src/components/Dashboard/KnowledgeBase/KnowledgeBase.jsx` rendering the catalogue grouped by `sectionSlug` and ordered by `order`, with sub-topics nested one level under their parent
- [X] T008 Create `public/src/components/Dashboard/KnowledgeBase/KnowledgeBaseTopic.jsx` rendering one row — title, summary, and a slot for the view-video and jump controls added in later phases
- [X] T009 [P] Create `routes/knowledge_base.js` as an Express router that applies `authorize_admin` from `middleware/auth.js` to every route, following the structure of an existing router such as `routes/server_logs.js`
- [X] T010 Mount the new router at `/api/knowledge-base` in `server.js`, alongside the other `app.use("/api/...", ...)` router mounts

**Checkpoint**: The Knowledge Base appears in the dashboard navigation, `/admin?tab=knowledge-base`
resolves to it, and all ten entries are listed with no controls yet.

---

## Phase 3: User Story 1 — Discover what I can do and learn how (Priority: P1) 🎯 MVP

**Goal**: An administrator can browse every topic and play its tutorial video, with unrecorded and
broken entries degrading gracefully instead of failing.

**Independent Test**: Open the Knowledge Base, confirm all 6 topics and 4 sub-topics are listed, and
play each recorded tutorial through to completion including a mid-video seek. Delivers standalone
value — a new administrator can learn the system unaided — even if no jump control ever ships.

### Implementation for User Story 1

- [X] T011 [P] [US1] Add the `knowledge_base_view_log` table and its two indexes to `create_tables.sql`, exactly as specified in data-model.md §4
- [X] T012 [US1] Implement `GET /api/knowledge-base/videos/:videoId` in `routes/knowledge_base.js` per contracts §1: resolve `:videoId` through a server-side copy of the catalogue's id → filename map, 404 on any miss *before* touching the filesystem, assert the resolved absolute path is still inside `file_storage/knowledge_base/`, then serve with `res.sendFile()` so `send` supplies `206`/`416`/`Accept-Ranges` handling
- [X] T013 [US1] **Security-critical.** Add a guard in `server.js` that returns `404` for any request to `/uploads/knowledge_base/*`, registered **above** the `express.static` mount at line 106. Express matches middleware in registration order, so a guard registered below is dead code and FR-020 fails silently. Verify with quickstart scenario 6 check 1 before considering this task done
- [X] T014 [P] [US1] Create `public/src/components/Dashboard/KnowledgeBase/VideoDialog.jsx` — an MUI `Dialog` wrapping a native `<video controls preload="metadata">` whose `src` is `/api/knowledge-base/videos/{videoId}`, per research R6. The httpOnly `a-usr` cookie is sent automatically on this same-origin request; do not fetch a blob or pass a token
- [X] T015 [US1] Wire the view-video control into `KnowledgeBaseTopic.jsx`: opens `VideoDialog` when the topic has a `video`, and renders visibly disabled with a "not yet recorded" label when `video` is `null` (FR-010). Closing the dialog must leave catalogue scroll position untouched
- [X] T016 [US1] Handle video load failure in `VideoDialog.jsx` by surfacing a "video unavailable" message inside the dialog, leaving the rest of the catalogue interactive (FR-011) — this is the 404 case for a catalogue entry whose file is absent from disk
- [X] T017 [P] [US1] Render `durationLabel` on each topic row in `KnowledgeBaseTopic.jsx` so an administrator can judge the time commitment before opening the video (FR-014), omitting it gracefully when absent
- [X] T018 [US1] Implement `POST /api/knowledge-base/views` in `routes/knowledge_base.js` per contracts §2: reject unknown `topicId` or an `eventType` outside `topic_opened` / `video_played` with `400`, take the acting admin from the verified `req.user` and never from the body, insert through `services/dbService.js`, return `204`
- [X] T019 [US1] Emit `topic_opened` and `video_played` events from `KnowledgeBase.jsx` / `VideoDialog.jsx` as fire-and-forget calls — not awaited, errors swallowed, so telemetry can never block playback (FR-015)
- [ ] T020 [US1] Run quickstart scenarios 1, 2, 3, 6, and 10. Scenario 6 is mandatory and must produce `404, 401, 200, 200`
      - **Partially done.** Scenarios 6 and 10 were executed against a running server and pass (see the verification log below). Scenarios 1, 2, and 3 need a browser and are blocked by the pre-existing `Header.jsx` build failure

**Checkpoint**: US1 is fully functional. The catalogue browses, videos play and seek, unrecorded and
missing videos degrade cleanly, recordings are unreachable without an admin session, and views are
logged.

---

## Phase 4: User Story 2 — Go straight to the section the tutorial is about (Priority: P2)

**Goal**: The jump control lands the administrator on the exact place the tutorial describes, offering
a destination picker when the topic has sub-topics, and offers a way back.

**Independent Test**: Activate the jump control on every catalogue entry and confirm arrival at the
correct section or panel, that topics with sub-topics present a picker and topics without navigate
immediately, and that Back returns to the Knowledge Base.

### Implementation for User Story 2

- [X] T021 [P] [US2] Add `"create-template": "create-template"` and `"event-logs": "event-logs"` to the `panelMap` object in `public/src/components/Dashboard/WhatsApp/WhatsApp.jsx` (lines 958-970). Both panels are already rendered (`:1316` and `:1296`) but absent from the map, so their `?view=` URLs are currently inert. This addition is strictly additive — every existing `?view=` URL keeps working
- [X] T022 [P] [US2] Add a destination URL builder to `knowledgeBase.catalog.js` (or a small sibling helper) producing `/admin?tab={tab}` or `/admin?tab={tab}&view={view}`, always with `&from=knowledge-base` appended, per data-model.md §2
- [X] T023 [US2] Create `public/src/components/Dashboard/KnowledgeBase/JumpMenu.jsx` — an MUI `Menu` listing the parent topic's own destination **first**, then each sub-topic's destination (FR-018). The parent option is never dropped, so an administrator can still ask for the section overview
- [X] T024 [US2] Wire the jump control into `KnowledgeBaseTopic.jsx` next to the view-video control (FR-007): a topic with `subTopics` opens `JumpMenu`; a topic without navigates immediately with no intermediate step
- [X] T025 [US2] Ensure the jump **pushes** a history entry rather than replacing it, so Back returns to the Knowledge Base (FR-009). Note that `handleSetOpenPanel` in `WhatsApp.jsx:974-992` navigates with `{ replace: true }` — correct for panel churn, but the initial jump must not inherit it or the Knowledge Base entry is overwritten
- [X] T026 [US2] Render a "Back to Knowledge Base" control in the dashboard section header while `from=knowledge-base` is present in the URL, in `public/src/components/Dashboard/Dashboard.jsx`, covering the mobile case where Back is less discoverable
- [ ] T027 [US2] **Blocked on a browser.** Run quickstart scenarios 4, 5, and 7. In scenario 5, `create-template` is the destination most likely to fail — if that panel does not open, T021 was not applied

**Checkpoint**: US1 and US2 both work independently. Every destination in the research R1 mapping table
is reachable.

---

## Phase 5: User Story 3 — Find the one topic I need (Priority: P3)

**Goal**: Free-text search narrows the catalogue, matching both top-level topics and sub-topics.

**Independent Test**: Enter terms matching a sub-topic and confirm it appears with parent context;
enter a non-matching term and confirm the empty state; clear and confirm the full catalogue returns.

### Implementation for User Story 3

- [X] T028 [US3] Add a search input and its debounced state to `public/src/components/Dashboard/KnowledgeBase/KnowledgeBase.jsx`
- [X] T029 [US3] Implement case-insensitive filtering over `title` and `summary` across both levels in `KnowledgeBase.jsx`, so that a matching sub-topic is rendered together with enough of its parent topic to place it in context (FR-013)
- [X] T030 [P] [US3] Add an empty state to `KnowledgeBase.jsx` explaining that no topics matched, with a control that clears the search
- [ ] T031 [US3] **Blocked on a browser.** Run quickstart scenario 8

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T032 [P] **Blocked on a browser** (styles written, unverified). Verify and fix mobile layout at 375 px in `KnowledgeBase.scss` — no horizontal overflow, tappable controls, the video dialog fits, and `JumpMenu` is usable (FR-012). Run quickstart scenario 9, on real iOS Safari if available, since that is where native `<video>` behaviour diverges most
- [X] T033 [P] Record the state of spec.md US2 acceptance scenario 4 (jump control unavailable for a section the administrator may not use) in the spec's Assumptions: `Dashboard.jsx` has no per-admin permission model — `tabConfig` is not filtered by role, and `authorize_admin` (`middleware/auth.js:6-48`) grants all-or-nothing admin access — so that scenario is currently vacuous. Do **not** invent a permission system here; note it as depending on a future administrator-assignment feature
- [X] T034 [P] **Not applicable.** `README.md` is a 73-line changelog, not a list of dashboard sections — nothing to add. Checked and dismissed
- [ ] T035 **Blocked on a browser.** Run the full `quickstart.md` sign-off table end to end and record results

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately
- **Foundational (Phase 2)**: needs Phase 1 — **blocks all user stories**
- **US1 (Phase 3)**: needs Phase 2. No dependency on US2 or US3
- **US2 (Phase 4)**: needs Phase 2. Independently testable; does not require US1
- **US3 (Phase 5)**: needs Phase 2. Independently testable; does not require US1 or US2
- **Polish (Phase 6)**: needs whichever stories are being shipped

### Critical Path

T001 → T004 → T007/T008 → T012 → T013 → T020. T013 is the security gate: **do not deploy any build
that has T012 without T013**, or the recordings are world-readable at `/uploads/knowledge_base/`.

### Within-File Serialization

- T005 and T006 both edit `Dashboard.jsx` — run in order, never in parallel
- T026 also edits `Dashboard.jsx` — after T005/T006
- T012 and T018 both edit `routes/knowledge_base.js` — run in order
- T010 and T013 both edit `server.js` — run in order

### Parallel Opportunities

- Phase 1: T002 and T003 together
- Phase 2: T009 in parallel with T004-T008 (server vs. client, no shared files)
- Phase 3: T011, T014, T017 together; T012 and T013 are server-side and serialize on `server.js`
- Phase 4: T021 and T022 together (different files)
- Phase 6: T032, T033, T034 together
- Across stories: with more than one person, US1, US2, and US3 can proceed simultaneously once Phase 2
  is done — they touch different files apart from `KnowledgeBaseTopic.jsx`, which US1 (T015) and
  US2 (T024) both extend

## Parallel Example: User Story 1

```bash
# After T012/T013 land, these three touch different files:
Task: "T011 Add knowledge_base_view_log to create_tables.sql"
Task: "T014 Create VideoDialog.jsx"
Task: "T017 Render durationLabel in KnowledgeBaseTopic.jsx"
```

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → 4. **STOP and validate** with quickstart
scenarios 1, 2, 3, 6, 10.

That is a shippable increment: administrators get a browsable catalogue and working tutorials. The jump
control is what makes it feel finished, but its absence does not make the feature useless.

### Incremental Delivery

- **Increment 1 (MVP)**: Phases 1-3 — browse and watch
- **Increment 2**: Phase 4 — jump to section, including the two `panelMap` additions
- **Increment 3**: Phase 5 — search
- **Increment 4**: Phase 6 — polish and full sign-off

### Content Dependency

Tasks T004 and T017 need the real tutorial recordings and their durations. Recordings are placed on the
server by hand and are not part of any task here. Until a recording exists, its catalogue entry ships
with `video: null` and renders as "not yet recorded" (FR-010) — so implementation is not blocked on
content, and content is not blocked on implementation.


---

## Verification Log (2026-08-18)

Server-side checks executed against a real instance on port 5599, with a locally minted admin JWT.
Test fixtures (a dummy recording, four telemetry rows) were removed afterwards.

| Check | Expected | Actual |
|---|---|---|
| `/uploads/knowledge_base/<file>` — no session | 404 | 404 |
| `/uploads/knowledge_base/../gec-logo.png` raw (`--path-as-is`) | 404 | 404 |
| `/uploads/knowledge_base/..%2fgec-logo.png` | 404 | 404 |
| `/uploads/Knowledge_Base/<file>` (case variant) | 404 | 404 |
| `/uploads/gec-logo.png` — unrelated upload still works | 200 | 200 |
| `GET /api/knowledge-base/videos/:id` — no session | 401 | 401 |
| `GET /api/knowledge-base/videos/:id` — admin session | 200 | 200 |
| Range `bytes=0-511` | 206 + `Content-Range: bytes 0-511/2048` | 206, header correct |
| Range past EOF | 416 | 416 (after a fix — see below) |
| Declared video, file absent from disk | 404 | 404 |
| Unknown `videoId` | 404 | 404 |
| `videoId` = `..%2F..%2F.env`, admin session | 404 | 404 |
| `POST /views` — no session | 401 | 401 |
| `POST /views` — valid | 204 + row written | 204, row written with `admin_user` from the JWT |
| `POST /views` — unknown `topicId` | 400 | 400 |
| `POST /views` — invalid `eventType` | 400 | 400 |

**One fix during verification**: Range past EOF initially returned 404 because the `sendFile` error
callback flattened every failure. It now passes through `err.status`, so `send`'s 416 (with its
correct `Content-Range`) reaches the client.

**`/uploads/knowledge_base2/x.mp4` returns 200** — this is the SPA `index.html` catch-all, identical to
any nonexistent path (`text/html`, ~5 KB). Not a file leak; confirmed by content-type and by comparing
against a control path.
