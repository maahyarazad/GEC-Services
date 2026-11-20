#!/usr/bin/env node
"use strict";

// Generates the Google Wallet generic class definition and images for <design>.html.
// Output: class.json, look.json, hero.png (the design) and logo.png (the Apple logo, square, transparent).
// Nothing is sent to Google.

const fs = require("fs");
const path = require("path");
const { parseArgs } = require("./lib/args");
const { REPO_ROOT, listDesigns, loadDesign } = require("./lib/design");
const { renderDesign, renderLogoImage } = require("./lib/render");
const { withTempOutput } = require("./lib/atomicOutput");
const { GOOGLE_SIZES, DEFAULT_ISSUER_ID, buildClass, buildLook } = require("./lib/googleClass");

const USAGE = `Usage: node scripts/wallet/generate-google-class.js <design> [--out <dir>] [--issuer <id>] [--root <dir>] [--logo <png>]
       node scripts/wallet/generate-google-class.js --list`;

async function main(argv) {
  const { positional, flags } = parseArgs(argv, ["out", "issuer", "root", "logo"]);
  const rootDir = flags.root ? path.resolve(flags.root) : REPO_ROOT;

  if (flags.list || positional.length === 0) {
    console.log(USAGE);
    const names = listDesigns(rootDir);
    console.log(names.length ? `Available designs: ${names.join(", ")}` : "No designs found.");
    return flags.list ? 0 : 1;
  }

  const design = loadDesign(positional[0], rootDir);
  const outDir = path.resolve(flags.out || path.join(REPO_ROOT, "wallet_assets", "google", design.name));
  const issuerId = flags.issuer || DEFAULT_ISSUER_ID;
  // The Google logo is the same logo as on the Apple pass (the model's logo-original.png).
  const logoFile = path.resolve(flags.logo || path.join(REPO_ROOT, "models", "membership.pass", "logo-original.png"));
  const genericClass = buildClass(design, { issuerId });

  const written = await withTempOutput(outDir, async (tmp) => {
    await renderDesign(design, { mode: "hero", ...GOOGLE_SIZES.hero, scale: 1, outFile: path.join(tmp, "hero.png") });
    await renderLogoImage({ logoFile, size: GOOGLE_SIZES.logo.width, outFile: path.join(tmp, "logo.png") });
    fs.writeFileSync(path.join(tmp, "class.json"), JSON.stringify(genericClass, null, 2) + "\n");
    fs.writeFileSync(path.join(tmp, "look.json"), JSON.stringify(buildLook(design, { issuerId }), null, 2) + "\n");
  });

  console.log(`Google Wallet class "${genericClass.id}" written to ${outDir}`);
  for (const f of written) console.log(`  ${f}`);
  console.log("Next: host hero.png and logo.png at public URLs, then create or update the class in Google Wallet (class.json).");
  return 0;
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
