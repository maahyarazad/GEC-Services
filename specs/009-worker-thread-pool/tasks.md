---
description: "Task list for offloading CPU-bound work to a worker thread pool"
---

# Tasks: Offload CPU-Bound Work to a Worker Thread Pool

**Input**: Design documents from `/specs/009-worker-thread-pool/`

**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/worker-tasks.md ✅, quickstart.md ✅

**Tests**: No test tasks generated. `package.json` defines no test runner and none was requested; validation is the `quickstart.md` scenarios, referenced explicitly per story.

**Note on user stories**: no `spec.md` exists for this feature. Stories below are derived from the **Migration Candidates** priority table in `plan.md` (P0→US1 … P3→US5). Each is an independently shippable offload.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1–US5, mapping to the plan's priority table

## Path Conventions

Monolithic Express service at repository root: `services/`, `routes/`, `middleware/`. New worker entrypoints live in `services/workers/`. Paths below are repo-relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependency and baseline measurement

- [X] T001 Add `workerpool` to `dependencies` in `package.json` and install it (currently absent — confirmed by grep against the dependency block)
- [X] T002 [P] Create the `services/workers/` directory with a `README.md` stating the worker contract: no `better-sqlite3`, no Express, no `dotenv`, absolute paths only
- [ ] T003 [P] Capture the pre-migration baseline per `quickstart.md` Scenario 1 — record health-check latency during a large-guest-list send through `services/whatsAppSender.js` and save the numbers into `specs/009-worker-thread-pool/quickstart.md` as the comparison target

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Pool infrastructure and the deployment fixes that must land before any pool is enabled

**⚠️ CRITICAL**: T004–T008 block every user story. Enabling a pool without T005 and T006 turns an event-loop stall into a pm2 restart loop (research Decisions 3 and 4).

- [X] T004 Create `services/workerPool.js` exporting `getPool(name)` and `terminateAll()` per `contracts/worker-tasks.md`; memoize one pool per family (`qr`, `pass`, `pdf`, `csv`) with `workerType: 'thread'`, `minWorkers: 2`, `maxWorkers: Math.min(4, Math.max(2, os.cpus().length - 1))`
- [X] T005 Raise `max_memory_restart` in `ecosystem.config.json` from `"200M"` to a value fitting parent heap plus pool (start at `"512M"`, confirm against T033)
- [X] T006 [P] Add `qr_files` and `qr-files` to the `ignore_watch` array in `ecosystem.config.json` so generated PNGs cannot trigger a `watch: true` restart mid-batch
- [ ] T007 [P] Determine whether `ecosystem.config.json` or `server-pm2.json` governs production (they disagree on `watch`) and record the answer in `specs/009-worker-thread-pool/research.md` under Open Question 2
- [X] T008 Register `terminateAll()` on `SIGTERM` and `SIGINT` in `server.js` so `pm2 reload` drains workers instead of hanging until the kill timeout

**Checkpoint**: Pool infrastructure exists and the deployment config is safe. User stories can now begin in parallel.

---

## Phase 3: User Story 1 - QR Generation Offload (Priority: P0) 🎯 MVP

**Goal**: Remove the multi-second event-loop stall during bulk WhatsApp sends, where `services/whatsAppSender.js:276` fans an unbounded `Promise.all` over an entire guest list across synchronous `QRCode.toFile` calls.

**Independent Test**: `quickstart.md` Scenarios 2–4 — health-check latency stays flat during a large bulk send, every guest still gets a valid scannable `qr_code_url`, and the PNG count matches the guest list.

### Implementation for User Story 1

- [X] T009 [US1] Create `services/workers/qrWorker.js` exposing `generateAndSaveQR(filePath, value)` via `workerpool.worker({...})`, using `QRCode.toFile`; it must not read `process.env` or create directories
- [X] T010 [US1] Refactor `generateQRWithText(event_page, code)` in `services/qrGenerator.js` to resolve the path, build the URL from `process.env.CLIENT_ORIGIN`, `mkdirSync` the parent, then `await getPool('qr').exec('generateAndSaveQR', [filePath, value])` — signature unchanged for `routes/registration.js:296`
- [X] T011 [US1] Refactor `generateQR_WhatsApp(contactId, eventId)` in `services/qrGenerator.js` the same way, still returning the composed public URL string from the main thread
- [X] T012 [P] [US1] In `services/qrGenerator.js`, remove the stray `fs.mkdirSync` from `check_generateQR_WhatsApp` — it writes on a read path — and leave the function on the main thread (pure `fs.existsSync`, no pool)
- [X] T013 [US1] Bound the fan-out at `services/whatsAppSender.js:276` (the `useGuestList` branch): replace the whole-array `Promise.all` with a chunked loop sized to the pool width, preserving the assigned `x.qr_code_url` values
- [X] T014 [US1] Apply the same bounded fan-out at `services/whatsAppSender.js:325` (the `twilio/media` branch over `enrichedPhoneList`)
- [X] T015 [P] [US1] Resolve the `qr-files/` (hyphen, used by `generateQRWithText`) vs `qr_files/` (underscore, used by `generateQR_WhatsApp`) directory split in `services/qrGenerator.js` — only the underscore form exists at repo root; unify or document the intent, and keep both in `ignore_watch` until unified
- [ ] T016 [US1] Validate against `quickstart.md` Scenarios 2, 3, and 4; compare latency to the T003 baseline

**Checkpoint**: MVP complete. The worst blocking path is gone and shippable on its own.

---

## Phase 4: User Story 2 - Apple Wallet Pass Offload (Priority: P1)

**Goal**: Move PKPass SHA-1 manifest hashing, PKCS#7 signing, and ZIP deflate off the request path in `routes/registration.js:307` and `routes/payment.js:302`, and stop re-reading signing material on every call.

**Independent Test**: `quickstart.md` Scenario 9 — registration and payment both yield a valid, installable `.pkpass`; cert and key are read once per worker, not once per pass.

### Implementation for User Story 2

- [X] T017 [US2] Create `services/workers/passWorker.js` exposing `buildApplePass(passData, modelPath, certPaths, passphrase) → Buffer`, with a module-level cert/key cache populated on first call
- [X] T018 [US2] Refactor `generateApplePass` in `services/applePassService.js` (line 85) to pass absolute `modelPath`/`certPaths` and the passphrase into the pool, removing the per-call `fs.readFileSync` at lines 49–50 and 112–113
- [X] T019 [US2] Refactor `generateMemberPass` in `services/applePassService.js` through the same pool task
- [X] T020 [US2] Verify call sites `routes/registration.js:307` and `routes/payment.js:302` still work unchanged now that a `Buffer` is returned rather than a pass object
- [ ] T021 [US2] Validate against `quickstart.md` Scenario 9

**Checkpoint**: US1 and US2 both independently functional.

---

## Phase 5: User Story 3 - Invoice PDF Offload (Priority: P1)

**Goal**: Move ~311 lines of synchronous pdfkit rendering out of the payment confirmation path at `routes/payment.js:308`.

**Independent Test**: `quickstart.md` Scenario 10 — a completed payment produces a PDF whose content matches a pre-migration reference render, timestamps aside.

### Implementation for User Story 3

- [X] T022 [US3] Create `services/workers/pdfWorker.js` exposing `renderInvoicePDF(invoice_data, payment_data, assets) → Buffer`; collect pdfkit chunks into a buffer instead of `doc.pipe(stream)` — a write stream cannot cross the thread boundary
- [X] T023 [US3] Refactor `generateInvoice` in `services/invoiceService.js` to resolve DB data and asset paths on the main thread, dispatch to the pool, and write the returned buffer to disk itself
- [X] T024 [US3] Verify the `routes/payment.js:308` call site signature is unchanged
- [ ] T025 [US3] Validate against `quickstart.md` Scenario 10, diffing against a reference PDF rendered before the migration

**Checkpoint**: US1–US3 independently functional.

---

## Phase 6: User Story 4 - Partner CSV Parse Offload (Priority: P2)

**Goal**: Stop parsing a partner-controlled upload buffer synchronously inside the `POST /upload-csv` handler at `routes/partner_onboarding.js:169`.

**Independent Test**: `quickstart.md` Scenario 11 — a large CSV upload keeps health-check latency flat, the response retains the `rowCount` / `faultyRecords` shape the frontend `ResultPanel` consumes, and oversized uploads are rejected before dispatch.

### Implementation for User Story 4

- [X] T026 [US4] Create `services/workers/csvWorker.js` exposing `parseAndNormalizeCSV(buffer, options) → { rows, rowCount, faultyRecords }`, combining the `csv-parse/sync` call and the per-row normalization loop into one task so rows cross the boundary only once
- [X] T027 [US4] Add an upload byte-size limit in `routes/partner_onboarding.js` enforced **before** pool dispatch — offloading changes where the work happens, not how much there is, and one oversized CSV can saturate the pool
- [X] T028 [US4] Refactor the `POST /upload-csv` handler in `routes/partner_onboarding.js` to pass `req.file.buffer` as a transferable to the pool, replacing the inline `parse(...)` at line 169 and the normalize loop at line 47
- [X] T029 [US4] Confirm the JSON response shape is byte-identical to the current contract so `public/src/components/PartnerOnboarding/ResultPanel.tsx` needs no change
- [ ] T030 [US4] Validate against `quickstart.md` Scenario 11

**Checkpoint**: All primary offloads complete.

---

## Phase 7: User Story 5 - Google Wallet JWT Signing (Priority: P3, measure first)

**Goal**: Decide with data whether RS256 signing in `services/googlePassService.js` justifies a pool at ~1ms per sign.

**Independent Test**: a recorded measurement plus a written decision — offloading is not assumed.

### Implementation for User Story 5

- [X] T031 [US5] Instrument and measure `jwt.sign` duration and call frequency in `services/googlePassService.js` under realistic load
- [X] T032 [US5] If and only if T031 shows material blocking, add a `jwt` task to the pool; otherwise record the "no change" decision in `specs/009-worker-thread-pool/research.md` under Decision 9

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T033 Validate the memory ceiling per `quickstart.md` Scenario 5 — RSS under `max_memory_restart` with the pool warm, zero memory-triggered restarts in `pm2 logs`; adjust T005's value from the measurement
- [ ] T034 Validate `watch` behaviour per `quickstart.md` Scenario 6 — uptime keeps climbing while QR files are generated (only applies if T007 found `ecosystem.config.json` is live)
- [ ] T035 Validate graceful shutdown per `quickstart.md` Scenario 7 — `pm2 reload` completes promptly
- [ ] T036 Validate error propagation per `quickstart.md` Scenario 8 across all migrated services; rewrite any caller branching on a custom error class or non-standard property, since only `message` and `stack` survive the worker boundary
- [X] T037 [P] Verify `UV_THREADPOOL_SIZE` is adequate for `bcrypt` in `services/userService.js:6` and `routes/gic_user.js:104` — these stay on libuv's threadpool and must **not** be moved to `workerpool` (research Decision 9)
- [X] T038 [P] Document the pool architecture and the "workers stay pure" rule in `docs/`, including the recorded non-candidates so they are not migrated later by mistake
- [X] T039 Record `better-sqlite3`'s synchronous queries as known residual event-loop blocking in `specs/009-worker-thread-pool/research.md` — out of scope here, candidate for a follow-up feature
- [ ] T040 Run the full `quickstart.md` suite end to end and confirm every scenario passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies; T003's baseline must be captured **before** any migration lands or the comparison is lost
- **Foundational (Phase 2)**: depends on T001; blocks all user stories
- **User Stories (Phases 3–7)**: all depend on Phase 2. Independent of each other — each targets a different service and pool
- **Polish (Phase 8)**: depends on at least US1; T033–T036 are most meaningful once two or more pools are live

### User Story Dependencies

- **US1 (P0)**: after Phase 2. No dependencies on other stories. **This is the MVP.**
- **US2 (P1)**: after Phase 2. Independent of US1
- **US3 (P1)**: after Phase 2. Independent of US1 and US2
- **US4 (P2)**: after Phase 2. Independent
- **US5 (P3)**: after Phase 2. Gated on its own measurement (T031)

### Within Each User Story

Worker entrypoint → service refactor → call-site verification → quickstart validation.

### Parallel Opportunities

- T002 and T003 in parallel (Setup)
- T006 and T007 in parallel (Foundational)
- T012 and T015 in parallel with T013/T014 — different files
- **All five user stories can run in parallel once Phase 2 is done**, since each owns a distinct worker file, service, and pool
- T037 and T038 in parallel (Polish)

---

## Parallel Example: After Foundational

```bash
# One developer per story — no shared files:
Task: "US1 — QR offload in services/workers/qrWorker.js + services/qrGenerator.js"
Task: "US2 — Apple pass offload in services/workers/passWorker.js + services/applePassService.js"
Task: "US3 — Invoice PDF offload in services/workers/pdfWorker.js + services/invoiceService.js"
Task: "US4 — CSV offload in services/workers/csvWorker.js + routes/partner_onboarding.js"
```

Note: T005/T006 both edit `ecosystem.config.json` — sequence them, or land them as one commit.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup — add `workerpool`, capture the baseline
2. Phase 2: Foundational — **critical**, the memory cap and `ignore_watch` fixes are not optional
3. Phase 3: User Story 1 — QR offload
4. **STOP and VALIDATE**: quickstart Scenarios 2–4 against the T003 baseline
5. Ship. This alone removes the worst stall in the service.

### Incremental Delivery

Each story ships on its own: US1 (bulk sends stop blocking) → US2 (registration/payment latency) → US3 (payment path) → US4 (partner uploads) → US5 (only if measured).

---

## Notes

- Workers must never import `services/dbService.js` — the `better-sqlite3` handle is main-thread-only
- Directory creation and `process.env` reads stay in the caller; workers receive primitives
- Commit after each task or logical group
- `routes/events.js:255` is intentionally untouched — pure `fs.existsSync`, no CPU cost


---

## Implementation status (2026-09-17)

**29 of 40 tasks complete.** All code and configuration changes are done. The 11
open tasks are runtime validation that needs a running server, pm2, and real
Twilio/payment traffic — none of it executable from a development session.

### Verified during implementation

Not a substitute for the quickstart scenarios, but each pool was exercised end
to end against real dependencies:

| Pool | Check | Result |
|------|-------|--------|
| `qr` | `generateQR_WhatsApp` through the pool | PNG written, correct public URL returned, `check_generateQR_WhatsApp` found it |
| `pass` | `generateApplePass` through the pool | 1,479,334-byte signed `.pkpass` produced with the real certificates in `certs/` |
| `pdf` | `generateInvoice` through the pool | 16,242-byte PDF written as `INVOICE-GWC-1709-2026-1234.pdf` |
| `csv` | `parseCSV` through the pool | Headers and rows parsed correctly |
| shutdown | `terminateAll()` after each run | Process exited cleanly, no hang |
| errors | A worker throw during PDF testing | Propagated to the caller's `catch` with an intact message |

All test artifacts were removed. Every modified module passes `node -c`, and the
full route tree loads via `require('./routes.js')(app)`.

### Blocked, and why

| Task | Needs |
|------|-------|
| T003, T016 | A running server plus a large-guest-list WhatsApp send to measure latency against |
| T007 | **A decision from the deploy owner** — see below |
| T021, T025, T030 | Real registration / payment / partner-upload flows |
| T033–T036, T040 | A live pm2 process |

### T007 blocks the value of T005 and T006

`package.json` starts the server with `pm2 start server.js` — a bare script path
that loads **neither** config file. If that is how production starts, the
`max_memory_restart` and `ignore_watch` edits made in T005/T006 never take
effect. Either deployment should switch to `pm2 start ecosystem.config.json`, or
that file should be deleted so it stops misleading readers. See research
Open Question 2.

### One item deferred out of scope

Decision 11 recommends `UV_THREADPOOL_SIZE=8`. It was deliberately **not**
applied, because the only place to set it is the same pm2 environment that T007
has not confirmed is loaded. Setting it in an unused file would look done
without being done.
