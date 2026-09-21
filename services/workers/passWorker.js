// passWorker.js — runs off the main thread. See README.md in this directory.
//
// PKPass generation is a stack of synchronous CPU work: SHA-1 hashing of every
// bundled asset into the manifest, a PKCS#7 detached signature, then ZIP deflate
// of the bundle. It previously ran inline on the registration and payment
// request paths.

const fs = require("fs");
const workerpool = require("workerpool");
const { PKPass } = require("passkit-generator");

// Signing material was previously read from disk on every single call. Warm
// workers read it once and reuse it; the cache is per-worker, which is why it
// lives here and not in the parent.
const certCache = new Map();

function loadCertificates(certPaths, passphrase) {
    const key = `${certPaths.wwdr}|${certPaths.signerCert}|${certPaths.signerKey}`;

    if (!certCache.has(key)) {
        certCache.set(key, {
            wwdr: fs.readFileSync(certPaths.wwdr),
            signerCert: fs.readFileSync(certPaths.signerCert),
            signerKey: fs.readFileSync(certPaths.signerKey),
            signerKeyPassphrase: passphrase,
        });
    }

    return certCache.get(key);
}

/**
 * Build a signed .pkpass bundle.
 *
 * The caller resolves every path, reads all DB data and formats every field
 * value — this worker only assembles and signs.
 *
 * @param {object} passData
 * @param {object} passData.props            serialNumber / description / logoText overrides
 * @param {object[]} passData.primaryFields
 * @param {object[]} passData.secondaryFields
 * @param {object[]} passData.auxiliaryFields
 * @param {string} passData.barcodeValue
 * @param {string} passData.expirationDate   ISO-8601; Date is rebuilt inside
 * @param {string} modelPath                 absolute path to the .pass model directory
 * @param {{wwdr: string, signerCert: string, signerKey: string}} certPaths absolute paths
 * @param {string} passphrase
 * @returns {Promise<Buffer>} the .pkpass bundle
 */
async function buildApplePass(passData, modelPath, certPaths, passphrase) {

    const pass = await PKPass.from(
        {
            model: modelPath,
            certificates: loadCertificates(certPaths, passphrase),
        },
        passData.props
    );

    for (const field of passData.secondaryFields || []) {
        pass.secondaryFields.push(field);
    }

    for (const field of passData.primaryFields || []) {
        pass.primaryFields.push(field);
    }

    for (const field of passData.auxiliaryFields || []) {
        pass.auxiliaryFields.push(field);
    }

    pass.setBarcodes(passData.barcodeValue);
    pass.setExpirationDate(new Date(passData.expirationDate));

    return pass.getAsBuffer();
}

workerpool.worker({ buildApplePass });
