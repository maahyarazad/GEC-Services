// workerPool.js
//
// Central construction point for every worker-thread pool in the service.
//
// The server runs as a single pm2 fork-mode process, so any synchronous CPU
// burst stalls the one event loop serving HTTP, the WhatsApp webhook and the
// websocket layer. CPU-bound work is dispatched here instead.
//
// One pool per workload family, not one shared pool: a long PDF or Wallet-pass
// job would otherwise head-of-line block short QR jobs in a shared FIFO queue,
// recreating the latency coupling this module exists to remove.
//
// See specs/009-worker-thread-pool/contracts/worker-tasks.md

const path = require("path");
const os = require("os");
const workerpool = require("workerpool");

// Worker isolates cost roughly 30-50MB RSS each. ecosystem.config.json caps the
// process via max_memory_restart, so this is bounded rather than taking every
// available core — an unbounded pool would trade an event-loop stall for a pm2
// restart loop under exactly the load the pool was added to survive.
const MAX_WORKERS = Math.min(4, Math.max(2, os.cpus().length - 1));

// Warm workers avoid ~30ms spawn latency on the first request after idle.
const MIN_WORKERS = 2;

const WORKER_SCRIPTS = {
    qr: path.join(__dirname, "workers", "qrWorker.js"),
    pass: path.join(__dirname, "workers", "passWorker.js"),
    pdf: path.join(__dirname, "workers", "pdfWorker.js"),
    csv: path.join(__dirname, "workers", "csvWorker.js"),
};

const pools = new Map();

/**
 * Get the pool for a workload family, constructing it on first use.
 * @param {'qr'|'pass'|'pdf'|'csv'} name
 */
function getPool(name) {
    const script = WORKER_SCRIPTS[name];

    if (!script) {
        throw new Error(`Unknown worker pool "${name}". Expected one of: ${Object.keys(WORKER_SCRIPTS).join(", ")}`);
    }

    if (!pools.has(name)) {
        pools.set(
            name,
            workerpool.pool(script, {
                minWorkers: MIN_WORKERS,
                maxWorkers: MAX_WORKERS,
                workerType: "thread",
            })
        );
    }

    return pools.get(name);
}

/**
 * Drain and terminate every constructed pool. Wired to SIGTERM/SIGINT in
 * server.js — without it, live worker threads keep the process alive and
 * `pm2 reload` hangs until the kill timeout.
 */
async function terminateAll() {
    const names = [...pools.keys()];

    await Promise.all(
        names.map(async (name) => {
            try {
                await pools.get(name).terminate();
            } catch (error) {
                console.error(`${Date.now()} - Failed to terminate "${name}" worker pool:`, error);
            }
        })
    );

    pools.clear();
}

/** Current pool width — callers use it to size their fan-out. */
function getMaxWorkers() {
    return MAX_WORKERS;
}

module.exports = { getPool, terminateAll, getMaxWorkers };
