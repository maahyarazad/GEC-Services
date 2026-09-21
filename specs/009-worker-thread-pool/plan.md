# Implementation Plan: Offload CPU-Bound Work to a Worker Thread Pool

**Branch**: `009-worker-thread-pool` | **Date**: 2026-09-17 | **Spec**: `specs/009-worker-thread-pool/spec.md` *(not yet created — see Constitution Check)*

**Input**: User-supplied `workerpool` draft for `services/qrGenerator.js`, plus a scan of the server codebase for additional offload candidates.

## Summary

The Express service runs as a **single pm2 fork-mode process** (no `instances`/`cluster` in `ecosystem.config.json` or `server-pm2.json`), so every synchronous CPU burst stalls the one event loop that serves all HTTP traffic, the WhatsApp webhook, and the websocket layer.

Several request paths do meaningful CPU work inline. The worst is bulk QR generation in `services/whatsAppSender.js:276` and `:325`, which fans out an unbounded `Promise.all` across the entire event guest list — `QRCode.toFile` is CPU-sync (matrix encode + PNG deflate), so `Promise.all` provides no concurrency, just a long uninterrupted block proportional to guest count.

**Approach**: introduce one shared `workerpool` pool per workload family, keep all I/O-path and env resolution on the main thread, and pass workers only plain serializable arguments. Ship QR first (it has the clearest hot spot and the user's draft is already sound), then Apple Wallet passes, invoice PDFs, and partner CSV parsing.

## Technical Context

**Language/Version**: Node.js v22.23.2, CommonJS

**Primary Dependencies**: Express, `better-sqlite3` (synchronous), `qrcode`, `passkit-generator`, `pdfkit`, `csv-parse`, `bcrypt`, `jsonwebtoken`. **`workerpool` is NOT currently in `package.json` and must be added.**

**Storage**: SQLite via `better-sqlite3` (`app.db`); generated artifacts on disk (`qr_files/`, `qr-files/`, `file_storage/`, `invoice_json_storage/`, `pass_storage/`)

**Testing**: NEEDS CLARIFICATION — no test runner is configured in `package.json`; validation is manual per `quickstart.md`

**Target Platform**: Linux server under pm2, single fork-mode instance

**Project Type**: Monolithic Express web service with a co-located React frontend in `public/`

**Performance Goals**: No single event-loop block exceeding ~50ms on a request path; a 200-guest bulk WhatsApp send must not make unrelated HTTP requests time out

**Constraints**:
- `ecosystem.config.json` sets `max_memory_restart: "200M"`. Each worker thread costs roughly 30–50MB RSS. `minWorkers: 2` plus `maxWorkers: os.cpus().length - 1` can exceed that cap and put pm2 into a restart loop. **This cap must be raised, or `maxWorkers` hard-bounded, before the pool ships.**
- `ecosystem.config.json` sets `watch: true` and its `ignore_watch` list does **not** include `qr_files` or `qr-files`. Workers writing PNGs can trigger a pm2 restart that kills the pool mid-flight. This is a latent bug today; the pool makes it louder.
- Workers must never touch `better-sqlite3` — the DB handle is main-thread-only in this codebase.

**Scale/Scope**: 4 services to migrate, ~6 call sites to update, 1 new `services/workers/` directory.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is **an unfilled template** — every principle is still a `[PRINCIPLE_N_NAME]` placeholder. There are no ratified gates to evaluate, so this check is **vacuously passing, not actually satisfied**.

Two process gaps are recorded here rather than silently skipped:

| Gate | Status | Note |
|------|--------|------|
| Constitution principles | ⚠️ Not established | Run `/speckit-constitution` to fill the template before this plan is treated as governed |
| Feature spec exists | ⚠️ Missing | `/speckit-plan` normally consumes `spec.md`; this plan was built directly from the user's draft plus a code scan. Run `/speckit-specify` to backfill the spec, or accept this plan as the authoritative input to `/speckit-tasks` |

Neither gap blocks the technical design below. Both are the user's call.

## Project Structure

### Documentation (this feature)

```text
specs/009-worker-thread-pool/
├── plan.md              # This file
├── research.md          # Phase 0 — candidate scan, decisions, rejected alternatives
├── data-model.md        # Phase 1 — task payload/result shapes
├── quickstart.md        # Phase 1 — validation scenarios
├── contracts/
│   └── worker-tasks.md  # Phase 1 — main-thread ↔ worker task contract
└── tasks.md             # Phase 2 — NOT created by /speckit-plan
```

### Source Code (repository root)

```text
services/
├── workers/                  # NEW — worker entrypoints, one per workload family
│   ├── qrWorker.js           # generateAndSaveQR
│   ├── passWorker.js         # buildApplePass        (phase 2)
│   ├── pdfWorker.js          # renderInvoicePDF      (phase 3)
│   └── csvWorker.js          # parseAndNormalizeCSV  (phase 4)
├── workerPool.js             # NEW — pool construction, sizing, shutdown registry
├── qrGenerator.js            # MODIFIED — delegates to pool
├── applePassService.js       # MODIFIED — delegates to pool; cache cert/key reads
├── invoiceService.js         # MODIFIED — delegates to pool
└── whatsAppSender.js         # MODIFIED — bound the fan-out at :276 and :325

routes/
├── partner_onboarding.js     # MODIFIED — csv-parse/sync at :169 moves to pool
├── registration.js           # call site :296, :307
├── payment.js                # call sites :271, :302, :308
└── events.js                 # call site :255 — stays on main thread (fs.existsSync only)

server.js                     # MODIFIED — SIGTERM/SIGINT → pool.terminate()
ecosystem.config.json         # MODIFIED — raise max_memory_restart, extend ignore_watch
package.json                  # MODIFIED — add workerpool dependency
```

**Structure Decision**: Keep the existing flat `services/` + `routes/` layout. Worker entrypoints get their own `services/workers/` subdirectory so that the "this file runs off the main thread, has no DB handle, and must stay pure" rule is visible from the path alone. Pool construction is centralized in `services/workerPool.js` rather than repeated per service, so sizing and shutdown are decided in exactly one place.

## Migration Candidates

Ranked by expected event-loop relief. Full evidence in `research.md`.

| # | Workload | Site | Why it blocks | Priority |
|---|----------|------|---------------|----------|
| 1 | **QR generation** | `services/qrGenerator.js` → hot at `services/whatsAppSender.js:276`, `:325` | `QRCode.toFile` is sync CPU; fanned out unbounded over a whole guest list, so cost scales linearly with no yield | **P0** |
| 2 | **Apple Wallet pass** | `services/applePassService.js:85` `generateApplePass`, `generateMemberPass`; called from `routes/registration.js:307`, `routes/payment.js:302` | PKPass does SHA-1 manifest hashing over every asset, PKCS#7 signing, and ZIP deflate — all sync, all inside the request | **P1** |
| 3 | **Invoice PDF** | `services/invoiceService.js` (pdfkit, ~311 lines of draw calls); called from `routes/payment.js:308` | Sits in the payment confirmation path; pdfkit layout and deflate are sync | **P1** |
| 4 | **Partner CSV parse** | `routes/partner_onboarding.js:169` (`csv-parse/sync`) + per-row normalize loop at `:47` | Sync parse of an attacker-sized upload buffer directly in the handler | **P2** |
| 5 | Google Wallet JWT sign | `services/googlePassService.js` (RS256 via `jsonwebtoken`) | Real but small (~1ms/sign). Measure before moving | **P3** |

### Explicit non-candidates

- **bcrypt** (`services/userService.js:6`, `routes/gic_user.js:104`) — the async `bcrypt.hash`/`bcrypt.compare` API already runs on libuv's threadpool. Wrapping it in `workerpool` would add a serialization hop for no gain. Action here is limited to confirming `UV_THREADPOOL_SIZE` is adequate.
- **`gSheetService.js` CSV** — uses streaming `csv-parser`, already chunked across ticks.
- **`routes/events.js:255` `check_generateQR_WhatsApp`** — pure `fs.existsSync`, no CPU cost. Stays on the main thread, exactly as the user's draft notes.
- **`better-sqlite3` queries** — synchronous and genuinely blocking, but the DB handle cannot cross into workers without a much larger redesign. Out of scope; recorded in `research.md` as known residual blocking.

## Complexity Tracking

> No ratified constitution principles exist to violate. Recorded here as design debt accepted knowingly:

| Item | Why Needed | Simpler Alternative Rejected Because |
|------|------------|--------------------------------------|
| New `workerpool` dependency | Node's raw `worker_threads` has no pooling, queueing, or backpressure; hand-rolling those is more code than the feature | `worker_threads` directly — would mean writing a pool anyway |
| Separate pools per workload family | Long PDF/pass jobs would otherwise head-of-line block short QR jobs in a shared queue | One global pool — simpler, but reintroduces the latency coupling this feature exists to remove |
| Worker files physically separated from their service | `workerpool` requires a standalone module path as the worker entrypoint | Inline worker source string — unreadable and undebuggable |
