# Quickstart: Validating the Worker Thread Pool

**Date**: 2026-09-17

Runnable checks proving the offload works and nothing regressed. See `contracts/worker-tasks.md` for signatures and `data-model.md` for payload shapes.

## Prerequisites

```bash
npm install workerpool
node -v            # expect v22.x
```

Confirm which pm2 config is live (`ecosystem.config.json` vs `server-pm2.json`) before testing restart behaviour — they disagree on `watch`.

---

## Scenario 1 — Baseline: prove the block exists

Run **before** migrating, to have a number to compare against.

1. Start the server.
2. In one terminal, poll the health endpoint continuously and record latency:
   ```bash
   while true; do curl -s -o /dev/null -w "%{time_total}\n" http://localhost:<PORT>/health_check; done
   ```
3. In another, trigger a bulk WhatsApp send against an event with a large guest list (the `useGuestList` path through `services/whatsAppSender.js:276`).

**Expected (pre-migration)**: health-check latency spikes for the duration of QR generation — this is the event-loop stall being measured.

---

## Scenario 2 — QR offload (P0)

Repeat Scenario 1 after migrating `services/qrGenerator.js`.

**Pass criteria**:
- Health-check latency stays flat during the bulk send; no sample exceeds ~50ms.
- Every guest still receives a valid `qr_code_url`.
- PNG count in `qr_files/` matches the guest list count.
- Spot-check one PNG: it scans, and resolves to `${CLIENT_ORIGIN}/event-registration/contactId=<id>&eventId=<id>`.

---

## Scenario 3 — Single-QR paths unchanged

1. Complete a registration through `routes/registration.js:296`.
2. Complete a payment through `routes/payment.js:271`.

**Pass criteria**: files land in the same directory as before, with identical naming. Note the pre-existing `qr-files/` vs `qr_files/` inconsistency (research Decision 5) — confirm which directory each path targets and that it is deliberate.

---

## Scenario 4 — `check_generateQR_WhatsApp` untouched

Hit the `routes/events.js:255` path.

**Pass criteria**: still returns the correct boolean, still runs on the main thread, no pool involvement.

---

## Scenario 5 — Memory ceiling

With the pool warm and under bulk load:

```bash
pm2 describe <app>      # inspect memory
pm2 logs <app> | grep -i restart
```

**Pass criteria**: RSS stays below `max_memory_restart`, and **no** memory-triggered restarts appear. A restart here means `maxWorkers` or the cap is still mis-set (research Decision 3).

---

## Scenario 6 — `watch` does not restart on generated files

Only if `ecosystem.config.json` (`watch: true`) is the live config.

1. Note the current uptime: `pm2 describe <app>`.
2. Generate QR codes.
3. Re-check uptime.

**Pass criteria**: uptime keeps climbing — the process did not restart. Failure means `ignore_watch` is still missing `qr_files`/`qr-files`.

---

## Scenario 7 — Graceful shutdown

```bash
pm2 reload <app>
```

**Pass criteria**: reload completes promptly rather than stalling until the kill timeout. A hang means `terminateAll()` is not wired to `SIGTERM`.

---

## Scenario 8 — Error propagation

Force a failure (e.g. point a task at an unwritable path).

**Pass criteria**: the caller's existing `try/catch` still catches it, the error is logged with a usable message and stack, and the process does not crash. Note that only `message` and `stack` survive the boundary.

---

## Scenarios 9–11 — Later phases

- **Apple pass (P1)**: register and pay; both produce a valid, installable `.pkpass`. Confirm cert/key are read once per worker, not once per pass.
- **Invoice PDF (P1)**: complete a payment; the PDF matches a pre-migration reference render byte-for-byte in content (timestamps aside).
- **Partner CSV (P2)**: upload a large CSV to `POST /upload-csv`. Response keeps the same `rowCount` / `faultyRecords` shape the `ResultPanel` frontend expects, health-check latency stays flat, and an oversized upload is rejected before dispatch rather than saturating the pool.
