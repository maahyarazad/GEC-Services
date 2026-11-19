"use strict";

const fs = require("fs");
const path = require("path");

// Builds output in a temp directory next to outDir and swaps it in only on success.
// On any failure the temp directory is removed and an existing outDir is left untouched.
async function withTempOutput(outDir, buildFn) {
  const parent = path.dirname(outDir);
  fs.mkdirSync(parent, { recursive: true });
  const stamp = `${process.pid}-${Date.now()}`;
  const tempDir = path.join(parent, `.${path.basename(outDir)}.tmp-${stamp}`);
  const oldDir = path.join(parent, `.${path.basename(outDir)}.old-${stamp}`);
  fs.mkdirSync(tempDir);
  try {
    await buildFn(tempDir);
    if (fs.readdirSync(tempDir).length === 0) {
      throw new Error("Nothing was generated.");
    }
    const hadOld = fs.existsSync(outDir);
    if (hadOld) fs.renameSync(outDir, oldDir);
    try {
      fs.renameSync(tempDir, outDir);
    } catch (err) {
      if (hadOld) fs.renameSync(oldDir, outDir);
      throw err;
    }
    if (hadOld) fs.rmSync(oldDir, { recursive: true, force: true });
  } catch (err) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw err;
  }
  return fs.readdirSync(outDir).sort();
}

module.exports = { withTempOutput };
