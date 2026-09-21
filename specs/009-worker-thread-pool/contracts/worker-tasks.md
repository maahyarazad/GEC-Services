# Contract: Main Thread ↔ Worker Tasks

**Date**: 2026-09-17

This is an internal contract. No public HTTP API changes, and no route signature changes — every migration below is behaviour-preserving from the client's point of view. The contract that matters is the one between callers and worker entrypoints.

## Pool module — `services/workerPool.js`

```js
getPool(name)        // → workerpool pool; constructs on first call, memoized thereafter
terminateAll()       // → Promise<void>; drains and terminates every pool
```

`name` ∈ `'qr' | 'pass' | 'pdf' | 'csv'`.

**Shutdown**: `server.js` registers `terminateAll()` on `SIGTERM` and `SIGINT`. Without it, pm2 `reload`/`restart` hangs until the kill timeout because live worker threads keep the process alive.

---

## Worker entrypoint convention

Each file in `services/workers/` ends with:

```js
workerpool.worker({ /* methodName: fn */ });
```

Worker modules **must not** require `services/dbService.js`, any Express module, or `dotenv`.

---

## Task signatures

### `qrWorker.js`

```
generateAndSaveQR(filePath: string, value: string) → void
```
Throws on encode or write failure. Caller guarantees the parent directory exists.

### `passWorker.js`

```
buildApplePass(passData: object, modelPath: string,
               certPaths: {signerCert: string, signerKey: string},
               passphrase: string) → Buffer
```
Caches cert/key per worker on first call.

### `pdfWorker.js`

```
renderInvoicePDF(invoice_data: object, payment_data: object,
                 assets: {logoPath?: string, fontPaths?: object}) → Buffer
```
Collects pdfkit output into a buffer; does not write to disk.

### `csvWorker.js`

```
parseAndNormalizeCSV(buffer: Buffer, options: object)
  → { rows: object[], rowCount: number, faultyRecords: object[] }
```
Caller enforces a size limit before dispatch.

---

## Preserved external behaviour

| Caller | Before | After |
|--------|--------|-------|
| `routes/registration.js:296` | `await generateQRWithText(...)` | unchanged signature |
| `routes/registration.js:307` | `await generateApplePass(data)` | unchanged signature |
| `routes/payment.js:271, :302, :308` | unchanged | unchanged |
| `routes/events.js:255` | `check_generateQR_WhatsApp` | **unchanged — stays on main thread** |
| `services/whatsAppSender.js:276, :325` | unbounded `Promise.all` | bounded fan-out, same resulting `qr_code_url` values |
| `routes/partner_onboarding.js` `POST /upload-csv` | sync parse in handler | same JSON response shape |

## Error contract

Worker rejections reach the caller as an `Error` carrying only `message` and `stack`. Existing `try/catch` blocks in the migrated services keep working, but any code branching on a custom error *class* or a non-standard property must be rewritten to branch on a string `code` embedded in the message, or on a returned result object.

## Configuration changes required

| File | Change | Why |
|------|--------|-----|
| `package.json` | add `workerpool` | Not currently a dependency |
| `ecosystem.config.json` | raise `max_memory_restart` above `200M` | Worker isolates exceed the cap (research Decision 3) |
| `ecosystem.config.json` | add `qr_files`, `qr-files` to `ignore_watch` | `watch: true` currently restarts on generated PNGs (research Decision 4) |
| `server.js` | `SIGTERM`/`SIGINT` → `terminateAll()` | Clean pm2 reloads |
