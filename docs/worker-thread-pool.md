# Worker thread pools

The server runs as a **single pm2 fork-mode process**. There is one event loop
serving HTTP, the WhatsApp webhook and the websocket layer, so any synchronous
CPU burst stalls all of them at once. CPU-bound generation is therefore
dispatched to worker threads.

## Layout

| File | Role |
|------|------|
| `services/workerPool.js` | Constructs and memoizes one pool per workload family; owns sizing and shutdown |
| `services/workers/*.js` | Worker entrypoints — run off the main thread |
| `services/workers/README.md` | The rules worker modules must follow |

## Pools

One pool **per workload family**, not one shared pool. A long invoice or Wallet
pass job would otherwise head-of-line block short QR jobs in a shared FIFO
queue, recreating the latency coupling the pools exist to remove.

| Pool | Worker | Used by |
|------|--------|---------|
| `qr` | `qrWorker.js` | `services/qrGenerator.js` |
| `pass` | `passWorker.js` | `services/applePassService.js` |
| `pdf` | `pdfWorker.js` | `services/invoiceService.js` |
| `csv` | `csvWorker.js` | `routes/partner_onboarding.js` |

Sizing: `minWorkers: 2` (warm, avoids ~30ms spawn latency on the first request
after idle), `maxWorkers: min(4, max(2, cpus-1))`. The upper bound is
deliberate — worker isolates cost roughly 30–50MB RSS each, and an unbounded
pool trades an event-loop stall for a pm2 memory restart loop.

## The rule: workers stay pure

Workers receive primitives and return data. The **caller** resolves paths, reads
`process.env`, creates directories and writes files. Workers never touch
`better-sqlite3` (the handle is main-thread-only), Express, or `dotenv`.

Errors cross the boundary carrying only `message` and `stack` — custom error
classes and extra properties do not survive.

## Bounded fan-out

Handing a whole guest list to a fixed-width pool at once queues one promise and
one result buffer per row for no throughput gain. `attachQrCodeUrls` in
`services/whatsAppSender.js` chunks to the pool width instead.

## Shutdown

`server.js` calls `terminateAll()` on `SIGTERM`/`SIGINT`. Without it, live
worker threads keep the process alive and `pm2 reload` hangs until the kill
timeout.

## Deliberate non-candidates

Do not migrate these — each was considered and rejected on evidence:

| Workload | Why it stays put |
|----------|------------------|
| `bcrypt` (`services/userService.js`, `routes/gic_user.js`) | The async API already uses libuv's threadpool. A worker hop adds serialization for zero gain |
| Google Wallet JWT RS256 (`services/googlePassService.js`) | Measured at 0.79ms per sign, called once per pass. The hop would cost more than the work |
| `check_generateQR_WhatsApp` (`services/qrGenerator.js`) | Pure `fs.existsSync`, no CPU cost |
| `gSheetService.js` CSV | Streaming `csv-parser`, already yields between chunks |
| Partner CSV row normalization | Fused into a `db.transaction` that writes as it normalizes; the DB handle cannot leave the main thread |

## Two QR directories — intentional

Do not "fix" this by unifying them:

- `qr-files/<event_page>/<code>.png` — registration QRs. Read by
  `routes/registration_config.js`, `routes/payment.js`, `routes/external_route.js`,
  `services/emailService.js`.
- `qr_files/<eventId>-<contactId>.png` — WhatsApp QRs. Served as `/qr_codes` by
  `server.js`, read by `routes/events.js`.

## Environment

`UV_THREADPOOL_SIZE` should be **8** in production. libuv's threadpool is
process-wide and shared by worker threads; at the default of 4, a burst of QR
writes can starve a concurrent `bcrypt.compare`. See
`specs/009-worker-thread-pool/research.md` Decision 11.

## Known residual blocking

`better-sqlite3` is synchronous. After this feature, CPU-bound generation no
longer blocks the event loop, but slow queries still do. See research
Decision 10.
