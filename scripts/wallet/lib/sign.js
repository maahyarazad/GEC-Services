"use strict";

// Builds manifest.json and the PKCS#7 signature for a pass model folder, the same way as:
//   openssl sha1 pass.json icon.png ...                      (manifest.json = file name -> SHA1)
//   openssl smime -binary -sign -certfile WWDR.pem -signer signerCert.pem -inkey signerKey.pem \
//           -in manifest.json -out signature -outform DER
// (passkit-generator ignores these two files and signs again at issue time; they make the
// folder a complete, signed pass package for manual checks and tools such as signpass.)

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const SKIP = new Set(["manifest.json", "signature"]);

function buildManifest(dir) {
  const manifest = {};
  for (const name of fs.readdirSync(dir).sort()) {
    if (SKIP.has(name) || name.startsWith(".")) continue;
    if (!fs.statSync(path.join(dir, name)).isFile()) continue;
    manifest[name] = crypto.createHash("sha1").update(fs.readFileSync(path.join(dir, name))).digest("hex");
  }
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest));
  return manifest;
}

function certPaths(certsDir) {
  return {
    wwdr: path.join(certsDir, "AppleWWDRCAG4.pem"),
    signerCert: path.join(certsDir, "signerCert.pem"),
    signerKey: path.join(certsDir, "signerKey.pem"),
  };
}

function openssl(args, env) {
  try {
    return execFileSync("openssl", args, { env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] }).toString();
  } catch (err) {
    const detail = (err.stderr && err.stderr.toString().trim()) || err.message;
    throw new Error(`openssl ${args[0]} failed: ${detail}`);
  }
}

// Returns { notAfter, expired }. Throws if the certificate cannot be read.
function checkSignerCertificate(certsDir) {
  const { signerCert } = certPaths(certsDir);
  if (!fs.existsSync(signerCert)) throw new Error(`Signer certificate not found: ${signerCert}`);
  const notAfter = openssl(["x509", "-in", signerCert, "-noout", "-enddate"]).trim().replace("notAfter=", "");
  let expired = false;
  try {
    execFileSync("openssl", ["x509", "-in", signerCert, "-noout", "-checkend", "0"], { stdio: "ignore" });
  } catch {
    expired = true;
  }
  return { notAfter, expired };
}

// The Pass Type ID the signer certificate was issued for (its UID). Wallet rejects a pass whose
// passTypeIdentifier differs from it.
function readPassTypeId(certsDir) {
  const { signerCert } = certPaths(certsDir);
  if (!fs.existsSync(signerCert)) throw new Error(`Signer certificate not found: ${signerCert}`);
  const subject = openssl(["x509", "-in", signerCert, "-noout", "-subject", "-nameopt", "RFC2253"]);
  const m = /UID=([^,\n]+)/.exec(subject);
  if (!m) throw new Error(`No Pass Type ID (UID) found in the subject of ${signerCert}.`);
  return m[1].trim();
}

function signManifest(dir, { certsDir, passphrase }) {
  const { wwdr, signerCert, signerKey } = certPaths(certsDir);
  for (const f of [wwdr, signerCert, signerKey]) {
    if (!fs.existsSync(f)) throw new Error(`Certificate file not found: ${f}`);
  }
  const manifestFile = path.join(dir, "manifest.json");
  const signatureFile = path.join(dir, "signature");
  openssl(
    ["smime", "-binary", "-sign", "-certfile", wwdr, "-signer", signerCert, "-inkey", signerKey,
      "-passin", "env:WALLET_SIGNER_PASSPHRASE", "-in", manifestFile, "-out", signatureFile, "-outform", "DER"],
    { WALLET_SIGNER_PASSPHRASE: passphrase }
  );
  // Make sure the signature really matches the manifest.
  openssl(["smime", "-verify", "-inform", "DER", "-in", signatureFile, "-content", manifestFile, "-noverify"]);
}

module.exports = { buildManifest, checkSignerCertificate, readPassTypeId, signManifest, certPaths };
