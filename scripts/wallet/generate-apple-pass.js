#!/usr/bin/env node
"use strict";

// Generates an Apple Wallet pass model (models/<design>.pass) from <design>.html,
// including manifest.json and the signature (openssl, with the certificates in certs/).
// Note: passkit-generator ignores those two files and signs again when a pass is issued.

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("./lib/args");
const { REPO_ROOT, listDesigns, loadDesign } = require("./lib/design");
const { renderDesign } = require("./lib/render");
const { withTempOutput } = require("./lib/atomicOutput");
const { ASSET_SIZES, BASE_FILES, buildPassJson } = require("./lib/applePass");
const { buildManifest, checkSignerCertificate, readPassTypeId, signManifest } = require("./lib/sign");

require("dotenv").config({ path: path.join(REPO_ROOT, ".env") });

const USAGE = `Usage: node scripts/wallet/generate-apple-pass.js <design> [--out <dir>] [--base <model-dir>] [--root <dir>]
         [--certs <dir>] [--no-sign] [--allow-expired]
       node scripts/wallet/generate-apple-pass.js --list`;

async function main(argv) {
  const { positional, flags } = parseArgs(argv, ["out", "base", "root", "certs"]);
  const rootDir = flags.root ? path.resolve(flags.root) : REPO_ROOT;

  if (flags.list || positional.length === 0) {
    console.log(USAGE);
    const names = listDesigns(rootDir);
    console.log(names.length ? `Available designs: ${names.join(", ")}` : "No designs found.");
    return flags.list ? 0 : 1;
  }

  const design = loadDesign(positional[0], rootDir);
  const outDir = path.resolve(flags.out || path.join(REPO_ROOT, "models", `${design.name}.pass`));
  const baseDir = path.resolve(flags.base || path.join(REPO_ROOT, "models", "membership.pass"));

  const basePassFile = path.join(baseDir, "pass.json");
  if (!fs.existsSync(basePassFile)) throw new Error(`Base model not found: ${basePassFile}`);
  for (const f of BASE_FILES) {
    if (!fs.existsSync(path.join(baseDir, f))) throw new Error(`Base model is missing ${f} in ${baseDir}`);
  }
  const basePass = JSON.parse(fs.readFileSync(basePassFile, "utf8"));

  // Fail early (before rendering) when the signing certificate cannot be used.
  const certsDir = path.resolve(flags.certs || path.join(REPO_ROOT, "certs"));
  const sign = !flags["no-sign"];
  // The pass must carry the Pass Type ID the certificate was issued for, or Wallet rejects it.
  let passTypeIdentifier;
  try {
    passTypeIdentifier = readPassTypeId(certsDir);
  } catch (err) {
    if (sign) throw err;
  }
  if (sign) {
    const { notAfter, expired } = checkSignerCertificate(certsDir);
    if (expired && !flags["allow-expired"]) {
      throw new Error(
        `The signer certificate in ${certsDir} expired on ${notAfter}. Renew it in the Apple Developer portal, ` +
          `or run with --no-sign (no manifest/signature) or --allow-expired (Wallet will reject the pass).`
      );
    }
    if (expired) console.warn(`Warning: signer certificate expired on ${notAfter}; Wallet will reject passes signed with it.`);
  }

  const written = await withTempOutput(outDir, async (tmp) => {
    for (const [name, size] of Object.entries(ASSET_SIZES)) {
      const scale = size.width / ASSET_SIZES.strip.width;
      await renderDesign(design, {
        mode: "strip",
        width: ASSET_SIZES.strip.width,
        height: ASSET_SIZES.strip.height,
        scale,
        outFile: path.join(tmp, `${name}.png`),
      });
    }
    for (const f of BASE_FILES) fs.copyFileSync(path.join(baseDir, f), path.join(tmp, f));
    fs.writeFileSync(path.join(tmp, "pass.json"), JSON.stringify(buildPassJson(design, basePass, { passTypeIdentifier }), null, 2) + "\n");
    if (sign) {
      buildManifest(tmp);
      signManifest(tmp, { certsDir, passphrase: process.env.APPLE_PASS_SIGNER_KEY_PASSPHRASE || "germany" });
    }
  });

  console.log(`Apple pass model for "${design.name}" written to ${outDir}`);
  if (passTypeIdentifier) console.log(`  passTypeIdentifier: ${passTypeIdentifier} (from the signer certificate)`);
  for (const f of written) console.log(`  ${f}`);
  return 0;
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });

