# Phase 0: Research — Worker Thread Pool Offload

**Date**: 2026-09-17

## Method

Scanned `services/`, `routes/`, `middleware/`, `websocket/`, `tasks/` for synchronous CPU work on request paths: native crypto/compression libraries, `*/sync` module variants, image/PDF/ZIP generation, and unbounded in-memory loops over user-controlled input. Cross-referenced each hit against its call sites to judge real-world blast radius.

---

## Decision 1: Adopt `workerpool`, ship QR first

**Decision**: Add `workerpool` and migrate `services/qrGenerator.js` before anything else.

**Rationale**: `qrcode`'s `toFile` is fully synchronous CPU (Reed–Solomon matrix encode, then PNG deflate). The damaging call site is `services/whatsAppSender.js:276`:

```js
await Promise.all(
    result.map(async (x) => {
        x.qr_code_url = await generateQR_WhatsApp(Number(x.id), Number(eventId));
    })
);
```

`result` is every contact on the event guest list, unbounded. Because the work inside is sync, `Promise.all` buys nothing — it schedules N CPU bursts back to back on one thread. The same shape repeats at `:325` for the media-template branch. A 200-guest send is a single multi-second stall during which the health check, webhooks, and websockets are all dead. This is the clearest win available.

**Alternatives considered**:
- *Raw `worker_threads`* — no pool, no queue, no backpressure; we would rebuild `workerpool` badly.
- *`piscina`* — a good library, marginally faster, but ESM-first and this codebase is CommonJS throughout. Not worth the friction.
- *Child processes* — far higher per-task cost for work measured in milliseconds.
- *Leave it and just chunk the loop* — `await`ing between chunks yields the loop and would genuinely help, but total wall-clock stays serialized on one core. Worth doing **in addition** (see Decision 5), not instead.

---

## Decision 2: Separate pools per workload family

**Decision**: `services/workerPool.js` exposes a small factory; QR, pass, PDF, and CSV each get their own pool rather than sharing one.

**Rationale**: An invoice PDF or a Wallet pass takes an order of magnitude longer than a QR encode. In a shared FIFO queue a burst of PDFs head-of-line blocks every QR job behind it, recreating the latency coupling this feature is meant to remove — just moved off the main thread.

**Alternatives considered**: one global pool (simpler, fewer idle threads, but couples unrelated latencies); one pool per call site (thread explosion against the 200M memory cap).

---

## Decision 3: Worker sizing must respect the pm2 memory cap

**Decision**: Bound `maxWorkers` explicitly and raise `max_memory_restart` before enabling the pool.

**Rationale**: `ecosystem.config.json` sets `max_memory_restart: "200M"`. A V8 isolate per worker thread costs roughly 30–50MB RSS. The draft's `maxWorkers: Math.max(2, os.cpus().length - 1)` on an 8-core box means up to 7 workers — 200–350MB of workers alone, before the parent heap. pm2 would kill and restart the process under exactly the load the pool was added to survive, which is a worse failure than the block it replaces.

Required together:
1. Raise `max_memory_restart` to a value that fits parent + pool (measure; budget ~512M as a starting point).
2. Cap the pool: `Math.min(4, Math.max(2, os.cpus().length - 1))`.
3. Keep `minWorkers: 2` — warm workers avoid ~30ms spawn latency on the first request after idle.

**Alternatives considered**: `minWorkers: 0` (lower idle footprint, but pays spawn cost on every cold path and makes p99 spiky).

---

## Decision 4: Fix the pm2 `watch` interaction before shipping

**Decision**: Add `qr_files` and `qr-files` to `ignore_watch` in `ecosystem.config.json`.

**Rationale**: That config runs with `watch: true`, and its `ignore_watch` list (`node_modules`, `logs`, `public`, `data`, `file_storage`, `app.db`) omits both QR output directories. Every generated PNG is a filesystem event that can restart the process. This is already a latent bug; once generation is in a pool, a restart mid-batch tears down workers holding in-flight jobs and produces partially written files. `server-pm2.json` has `watch: false` and is unaffected — confirm which config production actually uses.

---

## Decision 5: Keep all I/O and env resolution on the main thread

**Decision**: Workers receive only primitives — an absolute `filePath` and the string to encode. Directory creation, `process.env` lookup, and URL construction stay in the caller.

**Rationale**: The user's draft already does this correctly and it should be stated as the rule for the remaining migrations. Workers that read `process.env` or resolve paths relative to `__dirname` drift from the parent's assumptions and are painful to test. It also keeps task payloads trivially serializable across the structured-clone boundary.

Two bugs surfaced in the existing code while confirming this:

- **Directory naming — investigated (T015), NOT a bug; do not unify.** `generateQRWithText` writes `qr-files/` (hyphen) and `generateQR_WhatsApp` writes `qr_files/` (underscore). This looked like a typo because only `qr_files/` is committed, but `qr-files/` is created at runtime and both stores have distinct consumers:
  - `qr-files/<event_page>/<code>.png` — per-event registration QRs, read by `routes/registration_config.js:517`, `routes/payment.js:264`, `routes/external_route.js:21`, and `services/emailService.js:153,379,975`.
  - `qr_files/<eventId>-<contactId>.png` — WhatsApp QRs, statically served as `/qr_codes` by `server.js:123` and read by `routes/events.js:231`.

  Unifying them would break six call sites and the static mount. The correct action is to **document the split** and keep **both** in `ignore_watch`. The original Decision 5 assumption that only one directory was real was wrong.
- **`check_generateQR_WhatsApp` mkdirs on a read path**: it calls `fs.mkdirSync` before an existence check. Harmless but wrong; it makes a read operation a write.

Also recommended alongside Decision 1: bound the fan-out at `whatsAppSender.js:276`/`:325` to the pool width instead of mapping the whole array at once. Handing 500 tasks to a 4-worker pool queues 500 promises and 500 result buffers simultaneously for no throughput gain.

---

## Decision 6: Apple Wallet pass — offload *and* cache the certificate reads

**Decision**: Move `PKPass` construction into a worker; separately, hoist the cert/key reads out of the per-call path.

**Rationale**: `services/applePassService.js` performs `fs.readFileSync(signerCertPath)` and `fs.readFileSync(signerKeyPath)` on *every* call (lines 49–50 and 112–113). Those are sync disk reads per pass. Beyond that, `passkit-generator` hashes every bundled asset into the manifest, produces a PKCS#7 detached signature, and deflates the `.pkpass` ZIP — all synchronous, all inside `routes/registration.js:307` and `routes/payment.js:302`, i.e. while a user waits on a registration or payment response.

The cert caching is worth doing regardless of the pool; note that if signing moves to a worker, the cache must live in the worker, not the parent.

---

## Decision 7: Invoice PDF — offload, return a buffer

**Decision**: `renderInvoicePDF` runs in a worker and returns a `Buffer`; the main thread writes it.

**Rationale**: `services/invoiceService.js` is ~311 lines of sequential pdfkit draw calls terminating in `doc.end()`, invoked from `routes/payment.js:308` in the payment path. pdfkit layout and stream deflate are synchronous. Returning a buffer rather than having the worker write the file keeps the worker pure and leaves the filesystem layout owned by one module.

**Alternatives considered**: worker writes directly (fewer bytes copied across the boundary, but scatters path logic into workers — revisit only if buffer transfer shows up in profiling).

---

## Decision 8: Partner CSV — offload parse *and* normalization together

**Decision**: Move both `csv-parse/sync` (`routes/partner_onboarding.js:169`) and the per-row normalize loop (`:47`) into a single worker task.

**Rationale**: The handler synchronously parses a multipart upload buffer whose size is controlled by the uploading partner, then loops every row building new objects via `Object.entries(...).map(...)`. Splitting parse from normalize would ship the full parsed row array back across the boundary only to send it out again. One task, buffer in, clean rows out.

**Security note**: offloading changes *where* the work happens, not *how much* there is. A size limit on the upload is still required — a worker pool saturated by one oversized CSV is its own denial of service.

---

## Decision 9: Explicit non-candidates

| Candidate | Verdict | Reason |
|-----------|---------|--------|
| `bcrypt` — `services/userService.js:6`, `routes/gic_user.js:104` | **Do not move**, but see Decision 11 | The async API already runs on libuv's threadpool. `workerpool` would add a serialization hop for zero gain |
| `gSheetService.js` CSV | **Do not move** | Streaming `csv-parser`, already yields between chunks |
| `check_generateQR_WhatsApp` — `routes/events.js:255` | **Do not move** | Pure `fs.existsSync`; no CPU cost |
| Google Wallet JWT RS256 — `services/googlePassService.js:232,407` | **Measured — do not move** | Benchmarked at **0.79ms per sign** (RS256, 2048-bit, 200 iterations after warm-up, Node v22.23.2). Called once per pass generation, never in a loop. Two orders of magnitude under the ~50ms budget; a pool hop would cost more than the work |
| `better-sqlite3` queries | **Out of scope** | Genuinely synchronous and blocking, but the handle is main-thread-only. Moving it is a separate, much larger change. Recorded as known residual blocking |

---

## Open questions

1. **NEEDS CLARIFICATION — testing**: `package.json` defines no test runner (`"test": "echo \"Error: no test specified\" && exit 1"`). Are the `quickstart.md` scenarios the accepted validation bar for this change, or should a runner be introduced first?
2. **NEEDS CLARIFICATION — active pm2 config** *(investigated T007, not resolved)*: evidence gathered:
   - `package.json` scripts run `pm2 start server.js` / `pm2 restart server.js` — a **bare script path, referencing neither config file**. Started this way, pm2 synthesizes its own defaults, in which `watch` is `false` and `max_memory_restart` is unset.
   - `server-pm2.json` carries `username`, `vizion`, `pmx`, `instance_var` — the shape of a **pm2 process dump** (`pm2 save`), not a hand-authored ecosystem file.
   - `ecosystem.config.json` is the only hand-authored config, but nothing in the repo invokes it.

   **Consequence**: if production is started via `npm start`, the T005/T006 edits to `ecosystem.config.json` have **no effect at runtime** — and equally, the `watch: true` restart risk in Decision 4 never applies. The memory cap would instead be pm2's default (unbounded), which removes the T005 blocker but also removes the guard.

   **Requires the deploy owner to confirm the actual production start command.** If it is `npm start`, either switch deployment to `pm2 start ecosystem.config.json` so the memory cap and `ignore_watch` apply, or drop `ecosystem.config.json` to stop it misleading readers.
3. **NEEDS CLARIFICATION — production core count**: `maxWorkers` sizing and the `max_memory_restart` budget both depend on the deployment host's CPU and RAM, which were not determined from the repo.


---

## Decision 10: Residual main-thread blocking (out of scope, recorded)

`better-sqlite3` is synchronous by design. Every `db.prepare(...).get/all/run(...)` in `routes/` and `services/` blocks the event loop for the duration of the query, and `routes/partner_onboarding.js` runs a whole multi-row insert inside one `db.transaction`.

This is **not addressed by this feature**. The DB handle cannot cross into a worker thread as the code is currently structured, and moving it would require re-architecting every call site. Recorded here so the remaining blocking is known rather than assumed gone: after this feature, CPU-bound generation no longer blocks, but slow queries still do.

A follow-up feature would need to either move SQLite access behind a dedicated worker with a message-passing query API, or accept the blocking as bounded by query cost.

---

## Post-implementation corrections

Three assumptions made during planning turned out to be wrong when checked against the code. Recorded so the plan is not trusted over the source:

1. **QR directory split is intentional** — see the corrected note under Decision 5. `qr-files/` and `qr_files/` have six distinct consumers between them and must not be unified.

2. **Partner CSV normalization cannot be offloaded with the parse.** The `:47` normalization loop lives inside `insertMany`, a `db.transaction` that normalizes and inserts in the same pass. Only `csv-parse/sync` moved to the worker; splitting normalization out would mean restructuring that transaction, which is a larger change than this feature justifies.

3. **The CSV task result shape does not mirror `ResultPanel`.** `rowCount` and `faultyRecords` are produced by **client-side XLSX parsing** in `PartnerOnboarding.tsx`, not by `POST /upload-csv`. That endpoint returns `{status, message, total, inserted, skipped}` and the frontend reads only `message` from it. The response was preserved exactly; `data-model.md` has been corrected.

4. **An upload size limit already existed.** `multer` was already configured with `limits: { fileSize: 5 * 1024 * 1024 }`. T027 became documenting why that cap now also protects the worker pool, rather than adding a second limit.


---

## Decision 11: Raise `UV_THREADPOOL_SIZE` (found during T037)

**Decision**: set `UV_THREADPOOL_SIZE=8` in the production environment.

**Rationale**: `UV_THREADPOOL_SIZE` is not set anywhere in the repo, so it defaults to **4**. The important detail is that libuv's threadpool is **process-wide and shared by all worker threads** — it is not per-thread. Everything that uses it now contends in the same four slots:

- `bcrypt.hash` / `bcrypt.compare` on the main thread (`services/userService.js:6`, `routes/gic_user.js:104`)
- `QRCode.toFile` inside QR workers — it writes through `fs.createWriteStream`, which is libuv async I/O
- `fs.readFileSync` of signing material in pass workers (first call per worker)
- every other async `fs` call in the service

Before this feature, four slots served one thread. After it, they serve the main thread plus up to four workers. A burst of QR generation can therefore starve a concurrent login's `bcrypt.compare` — the pool would have moved CPU off the event loop only to introduce contention one layer down.

**Not applied automatically**: the only place to set it is the pm2 environment, and per Open Question 2 it is unconfirmed whether `ecosystem.config.json` is even loaded in production. Setting it in an unused file would look done without being done. The deploy owner should set `UV_THREADPOOL_SIZE=8` wherever the process environment is actually defined.

**Alternatives considered**: leaving it at 4 (risks the starvation above); raising it much higher (threads are cheap but not free, and 8 comfortably covers a 4-worker pool plus main-thread I/O).