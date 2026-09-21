# Phase 1: Data Model — Worker Task Payloads

**Date**: 2026-09-17

This feature adds no database tables and changes no schema. The "entities" here are the payloads that cross the main-thread ↔ worker boundary.

## Boundary rules (apply to every entity below)

1. **Structured-clone only.** Payloads carry strings, numbers, booleans, plain objects, arrays, and `Buffer`/`TypedArray`. No class instances, no functions, no `better-sqlite3` handles, no Express `req`/`res`.
2. **Absolute paths only.** Workers never resolve paths from `__dirname` or read `process.env`. The caller resolves and passes.
3. **Caller owns directory creation.** `fs.mkdirSync(..., { recursive: true })` happens on the main thread before dispatch.
4. **Errors cross as messages.** `workerpool` serializes a rejection's `message` and `stack`; custom error classes and extra properties do not survive. Encode anything the caller must branch on into a `code` string inside the message, or return a result object instead of throwing.

---

## Pool

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Workload family: `qr`, `pass`, `pdf`, `csv` |
| `script` | string (abs path) | Worker entrypoint under `services/workers/` |
| `minWorkers` | number | `2` — keeps threads warm |
| `maxWorkers` | number | `Math.min(4, Math.max(2, os.cpus().length - 1))` — bounded by the pm2 memory cap (research Decision 3) |
| `workerType` | `'thread'` | Explicit; never `'process'` for these workloads |

**Lifecycle**: constructed once at module load, reused for the process lifetime, terminated on `SIGTERM`/`SIGINT`.

---

## QRTask (P0)

**Method**: `generateAndSaveQR`

| Field | Type | Constraint |
|-------|------|------------|
| `filePath` | string | Absolute; parent directory must already exist |
| `value` | string | The URL to encode; built by the caller from `process.env.CLIENT_ORIGIN` |

**Result**: `void` — success is the file existing at `filePath`.

**Callers**: `generateQRWithText(event_page, code)`, `generateQR_WhatsApp(contactId, eventId)`. The public-URL string returned by the latter is composed on the main thread and never enters the worker.

---

## PassTask (P1)

**Method**: `buildApplePass`

| Field | Type | Constraint |
|-------|------|------------|
| `passData` | object | Plain serializable pass fields (name, event, dates, barcode payload) |
| `modelPath` | string | Absolute path to the `.pass` model directory |
| `certPaths` | `{ signerCert, signerKey }` | Absolute paths. The worker reads and caches them **module-locally** — see research Decision 6 |
| `passphrase` | string | Signer key passphrase, passed in, not read from env inside the worker |

**Result**: `Buffer` — the `.pkpass` bundle. The caller decides whether to stream it or persist it.

**State**: the worker holds one module-level cert cache, populated on first use. Warm workers pay the disk read once instead of once per pass.

---

## PDFTask (P1)

**Method**: `renderInvoicePDF`

| Field | Type | Constraint |
|-------|------|------------|
| `invoice_data` | object | Plain; already resolved from the DB by the caller |
| `payment_data` | object | Plain |
| `assets` | `{ logoPath?, fontPaths? }` | Absolute paths to static assets the renderer needs |

**Result**: `Buffer` — the rendered PDF. The main thread writes it to `invoice_json_storage/` (or wherever `invoiceService` currently targets).

**Note**: `invoiceService.js` today pipes into a write stream (`doc.pipe(stream)` at line 28). The worker version must collect chunks into a buffer instead, because the stream cannot cross the thread boundary.

---

## CSVTask (P2)

**Method**: `parseCSV`

| Field | Type | Constraint |
|-------|------|------------|
| `buffer` | Buffer | The raw upload. Size is capped upstream by multer at 5MB |
| `options` | object | The `csv-parse` options from `routes/partner_onboarding.js` (`columns: true`, `skip_empty_lines: true`, `trim: true`) |

**Result**: `object[]` — the parsed rows, headers as keys.

**Scope correction (found during implementation)**: the original design had this task also performing row normalization and returning `{ rows, rowCount, faultyRecords }`. That is not possible. The normalization loop lives inside `insertMany`, a `better-sqlite3` `db.transaction` that normalizes and inserts in the same pass — and the DB handle is main-thread-only. Only parsing moved.

**Also corrected**: `rowCount` and `faultyRecords` are **not** part of this endpoint's contract. They are produced by client-side XLSX parsing in `public/src/components/PartnerOnboarding/PartnerOnboarding.tsx` and passed to `ResultPanel` locally. `POST /upload-csv` returns `{status, message, total, inserted, skipped}`, of which the frontend reads only `message`. That response shape is unchanged by this feature.

**Bound**: `multer` already enforces `limits: { fileSize: 5 * 1024 * 1024 }`, which now doubles as the guard preventing one oversized upload from saturating the pool.
