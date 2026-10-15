---

description: "Task list for Do-Not-Reply Email Log (Admin Dashboard Section)"
---

# Tasks: Do-Not-Reply Email Log (Admin Dashboard Section)

**Input**: Design documents from `/specs/008-email-log-dashboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/email-log-api.md, quickstart.md

**Tests**: No automated test framework is configured in this project (root `package.json` `test` is a
stub; the client has only `vite` / `build` / `eslint`). Per the spec, validation is the **manual**
scenario suite in `quickstart.md`. No test tasks are generated; the Polish phase runs the quickstart.

**Organization**: Tasks are grouped by user story. Note the recording half of the feature (the
`email_log` table + the logging call inside the email transport) is **Foundational** — without it no
story has any data to show, so it blocks all three stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3 (user-story phases only)
- All paths are repo-relative to `/Users/germanworldclub/Downloads/registration-app20250717-update/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the empty module/dir skeleton so later tasks only fill in bodies.

- [X] T001 [P] Create skeleton files: `services/emailLogService.js`, `services/emailLogCategories.js`, `routes/email_log.js`, and the client dir `public/src/components/Dashboard/EmailLogs/EmailLogs.jsx` (empty default-export React component for now).

**Checkpoint**: Empty modules exist and the app still boots.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Stand up the recording pipeline (table + logging) and the section shell. No story can show data until sends are being recorded.

**⚠️ CRITICAL**: All of Phase 2 must complete before US1/US2/US3 deliver anything meaningful.

- [X] T002 [P] Define the category key→label map (the 13 keys from research.md R5, incl. `uncategorised`) and export it in `services/emailLogCategories.js`.
- [X] T003 [P] Document the `email_log` DDL (table + 3 indexes from data-model.md) in `create_tables.sql` as the source-of-truth mirror.
- [X] T004 Create `routes/email_log.js`: an Express router that runs the idempotent `email_log` migration at load (`CREATE TABLE IF NOT EXISTS` + indexes via `dbService.getDB()`, mirroring `routes/knowledge_base.js`), applies `require("../middleware/auth").authorize_admin` to `/api/email-log/*`, and exports the router. Register it in `routes.js` (require + add to `rootRouters`).
- [X] T005 Implement `logEmailSend({ category, to, bcc, subject, status, error })` in `services/emailLogService.js`: best-effort (whole body in try/catch, failures only `console.error`'d, never thrown), default `category` to `uncategorised`, lower-case recipients, and write **one row per recipient** across `to` + `bcc` (split strings/arrays) with `created_at = Date.now()`.
- [X] T006 Instrument the transport `sendRawEmailWithAttachments(...)` in `services/emailService.js`: accept an optional `category` field, call `emailLogService.logEmailSend({ category, to, bcc, subject, status:'sent' })` after `transporter.sendMail` resolves, and call it with `status:'failed'` + the error summary inside the existing `catch` **before** `throw error`. Must not change the function's return value or thrown error.
- [X] T007 Pass the correct `category` from each high-level sender in `services/emailService.js` (per research.md R5): `event_confirm_registration_email` / `_aws` / `_with_invoice` → `event-registration`; `comfirm_message_email` → `confirmation-message`; `membership_pass_email` → `membership-pass`; `emailMembershipCard` → `membership-card`; `membership__invitation` → `membership-invitation`; `email_otp` → `otp`; `email_request_received` → `request-received`; `company_data_confirmation_email` → `company-data-confirmation`; `gic__reset_password` → `password-reset`; `send_party_invitation` → `party-invitation`; `membership_courtacy_at_venue_message` → `venue-courtesy`; `sendBatchEmails` → `newsletter-batch`. **Do NOT** touch `sendRawEmailWithAttachments_AppSupport` (app.support sender, out of scope).
- [X] T008 Wire the section into `public/src/components/Dashboard/Dashboard.jsx` by **appending** (preserving all existing tab indices): add an "Email Logs" entry to `tabConfig` (a mail icon from `react-icons/md`, e.g. `MdOutlineEmail`), add `const EmailLogs = React.lazy(() => import("./EmailLogs/EmailLogs"))`, and add the matching `case` to the index-based content switch. In `EmailLogs.jsx` add a base layout + a fetch helper hitting `${import.meta.env.VITE_SERVERURL}/api/email-log/...` with `credentials:'include'`.

**Checkpoint**: Triggering any email writes a categorised `email_log` row; the empty "Email Logs" tab renders; `/api/email-log/*` is admin-guarded. Recording verified via `quickstart.md` V1.

---

## Phase 3: User Story 1 - See email categories as a list (Priority: P1) 🎯 MVP

**Goal**: An admin opens the Email Logs section and sees a list of email categories, each with a label and a sent count.

**Independent Test**: Trigger one of each kind of email, open Email Logs, confirm each category appears with a correct count (quickstart V2).

- [X] T009 [US1] Implement `getCategories()` in `services/emailLogService.js`: `SELECT category, COUNT(*) AS count, MAX(created_at) AS lastSent FROM email_log GROUP BY category`, resolve each key to its label via `emailLogCategories`, sort by `count` desc, and compute `total`.
- [X] T010 [US1] Add `GET /api/email-log/categories` to `routes/email_log.js` returning `{ status:true, categories, total }` per contracts/email-log-api.md (empty log → `categories:[]`).
- [X] T011 [US1] In `public/src/components/Dashboard/EmailLogs/EmailLogs.jsx`, fetch `/categories` on mount and render the category list (label + count, most-active first), with loading and empty-log states.

**Checkpoint**: US1 fully functional — category list renders from live data.

---

## Phase 4: User Story 2 - Drill into a category for time + recipient (Priority: P1)

**Goal**: Selecting a category shows its individual emails, each row with sent date-time and recipient.

**Independent Test**: Send a known email to a known address, open its category, confirm a row with correct recipient and sent time (quickstart V3).

- [X] T012 [US2] Implement `queryEntries({ category, page, pageSize })` in `services/emailLogService.js`: parameterised `WHERE category = ?` (optional), `ORDER BY created_at DESC`, `LIMIT/OFFSET` (clamp `pageSize` to [10,200]); return `entries` (with resolved `label`), `total`, `hasMore`.
- [X] T013 [US2] Add `GET /api/email-log/entries` to `routes/email_log.js` accepting `category`/`page`/`pageSize`, returning the paged shape in contracts/email-log-api.md (unknown category → empty page, not error).
- [X] T014 [US2] In `EmailLogs.jsx`, on category click fetch `/entries?category=…&page=…` and render the drill-down (reuse `components/CustomDataGrid.jsx` or an MUI table) with columns **Sent** (locale date-time from epoch ms), **Recipient**, **Category**, **Status**; add paging and a Back control to the category list (no full reload).

**Checkpoint**: US1 + US2 both work — categories list and per-category drill-down with time + recipient.

---

## Phase 5: User Story 3 - Search bar on top (Priority: P2)

**Goal**: A top search bar filters entries by recipient across all categories; clearing restores the normal view.

**Independent Test**: Send emails to two addresses, type one into the search bar, confirm only that address's entries remain; a non-matching search shows the empty state (quickstart V4).

- [X] T015 [US3] Extend `queryEntries()` and `GET /api/email-log/entries` to accept a `search` param: case-insensitive, parameter-bound `recipient LIKE %?%`, composing with `category` via AND (blank = no filter) — per contracts/email-log-api.md.
- [X] T016 [US3] In `EmailLogs.jsx`, add a search bar at the top (debounced input, server-side search spanning the whole log regardless of the open category) with a clear/reset control and an explicit "no matching emails" empty state.

**Checkpoint**: All three stories functional — categories, drill-down, and cross-category recipient search.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validate and harden; no new behaviour.

- [X] T017 [P] Run the `quickstart.md` validation scenarios V1–V6 end-to-end and record results.
- [X] T018 [P] Verify the safety invariants: `sendRawEmailWithAttachments_AppSupport` is NOT logged; every existing dashboard tab keeps its original index; a forced send failure still throws/handles exactly as before and a forced log-write failure does not break the send (quickstart V5).
- [X] T019 [P] Run eslint on the touched backend files and in `public/` (`npm run lint` / `eslint`) and fix any new warnings.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup; **blocks all user stories** (no data / no shell without it).
- **US1 / US2 / US3 (Phases 3–5)**: depend on Foundational. US1 and US2 are both P1; US3 (P2) depends on the entries endpoint created in US2 (T013) since it extends it.
- **Polish (Phase 6)**: depends on the stories being implemented.

### Within / across stories

- Foundational order: T002/T003 [P] → T004 → T005 → T006 → T007 (T005–T007 are sequential; T006 and T007 edit the same file `services/emailService.js`). T008 is independent of the backend chain and can proceed in parallel once T001 is done.
- US1: T009 → T010 → T011.
- US2: T012 → T013 → T014.
- US3: T015 (extends T012/T013) → T016.
- Service functions T009/T012/T015 all live in `services/emailLogService.js`; endpoint handlers T010/T013 and the search extension T015 all live in `routes/email_log.js`; UI tasks T011/T014/T016 all live in `EmailLogs.jsx` — so within those files tasks are sequential, not parallel.

### Parallel Opportunities

- T002 and T003 can run in parallel (different files).
- T008 (frontend shell) can run in parallel with the backend Foundational chain (T004–T007).
- Once Foundational is done, the backend and frontend halves of a story can be split between two people, and US1's backend (T009–T010) can run in parallel with US2's backend (T012–T013) as long as the shared files are coordinated.
- Polish tasks T017–T019 are independent of each other.

---

## Parallel Example: Foundational

```bash
# These touch different files and can run together:
Task: "T002 Define category key→label map in services/emailLogCategories.js"
Task: "T003 Document email_log DDL in create_tables.sql"
Task: "T008 Scaffold EmailLogs section + wire Dashboard.jsx tab"
```

---

## Implementation Strategy

### MVP First (US1 + US2, both P1)

1. Phase 1: Setup (T001).
2. Phase 2: Foundational (T002–T008) — **critical**: starts recording sends and renders the shell.
3. Phase 3: US1 (T009–T011) — category list. **Validate** (quickstart V2).
4. Phase 4: US2 (T012–T014) — drill-down with time + recipient. **Validate** (quickstart V3).
5. This is the shippable MVP: an admin can browse do-not-reply email by category and see who got what, when.

### Incremental Delivery

1. Setup + Foundational → recording live, section shell visible.
2. + US1 → categories visible → demo.
3. + US2 → drill-down → demo (MVP complete).
4. + US3 → search bar → demo.
5. Polish → quickstart validation + safety checks + lint.

---

## Notes

- [P] = different files, no dependency on an incomplete task.
- No automated tests are generated (no framework); the Polish phase runs `quickstart.md` manually.
- Logging is best-effort by contract — never let a log write change or delay a send (FR-003 / SC-004).
- Append the dashboard tab; do not insert mid-list (the content switch is index-based).
- Commit after each task or logical group.
