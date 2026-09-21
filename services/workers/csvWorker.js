// csvWorker.js — runs off the main thread. See README.md in this directory.
//
// `csv-parse/sync` blocks for the whole parse, and the input is a
// partner-supplied upload, so its cost is externally controlled.
//
// Scope note: only parsing runs here. Row normalization in
// routes/partner_onboarding.js is fused into a better-sqlite3 transaction
// (`insertMany`) that writes as it normalizes, and the DB handle is
// main-thread-only — so normalization cannot follow the parse into the worker
// without splitting that transaction apart.

const { parse } = require("csv-parse/sync");
const workerpool = require("workerpool");

/**
 * Parse CSV bytes into an array of row objects.
 *
 * @param {Buffer} buffer  raw upload bytes; the caller enforces the size limit
 * @param {object} options csv-parse options
 * @returns {object[]} parsed rows
 */
function parseCSV(buffer, options) {
    return parse(buffer, options);
}

workerpool.worker({ parseCSV });
