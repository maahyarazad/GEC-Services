// qrWorker.js — runs off the main thread. See README.md in this directory.
//
// QRCode.toFile is fully synchronous CPU work (Reed-Solomon matrix encode, then
// PNG deflate). On the main thread it blocks every other request for its whole
// duration; fanned out across a guest list it blocked for seconds at a time.

const QRCode = require("qrcode");
const workerpool = require("workerpool");

/**
 * Encode `value` as a QR PNG at `filePath`.
 *
 * The caller resolves the absolute path, creates the parent directory and
 * builds the URL — this worker reads no env and touches no directories.
 *
 * @param {string} filePath absolute path of the PNG to write
 * @param {string} value    the string to encode
 */
async function generateAndSaveQR(filePath, value) {
    await QRCode.toFile(filePath, value);
}

workerpool.worker({ generateAndSaveQR });
