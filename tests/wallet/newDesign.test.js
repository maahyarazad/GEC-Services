"use strict";

// Integration: both generators work for a design they have never seen, with no code changes.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const { findChrome, readPngSize } = require("../../scripts/wallet/lib/render");

const ROOT = path.resolve(__dirname, "../..");
const FIXTURES = path.join(__dirname, "fixtures");
const APPLE = path.join(ROOT, "scripts/wallet/generate-apple-pass.js");
const GOOGLE = path.join(ROOT, "scripts/wallet/generate-google-class.js");

let chromeMissing = null;
try {
  findChrome();
} catch (e) {
  chromeMissing = e.message;
}

const needsChrome = chromeMissing ? { skip: chromeMissing } : {};
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "wallet-int-"));

test("Apple generator builds a model for a new design (--no-sign: no manifest or signature)", needsChrome, () => {
  const out = path.join(tmp(), "blue_card.pass");
  execFileSync("node", [APPLE, "blue_card", "--root", FIXTURES, "--out", out, "--no-sign"]);
  const pass = JSON.parse(fs.readFileSync(path.join(out, "pass.json"), "utf8"));
  assert.equal(pass.backgroundColor, "rgb(26, 60, 143)");
  assert.ok(pass.storeCard);
  assert.deepEqual(readPngSize(path.join(out, "strip.png")), { width: 375, height: 144 });
  assert.deepEqual(readPngSize(path.join(out, "strip@3x.png")), { width: 1125, height: 432 });
  assert.ok(!fs.existsSync(path.join(out, "manifest.json")));
  assert.ok(!fs.existsSync(path.join(out, "signature")));
});

const certsDir = path.join(ROOT, "certs");
const haveCerts = ["AppleWWDRCAG4.pem", "signerCert.pem", "signerKey.pem"].every((f) => fs.existsSync(path.join(certsDir, f)));
const needsChromeAndCerts = chromeMissing ? { skip: chromeMissing } : haveCerts ? {} : { skip: "certs/ not available" };

test("Apple generator writes a manifest with SHA1 hashes and a valid signature", needsChromeAndCerts, () => {
  const out = path.join(tmp(), "blue_card.pass");
  // --allow-expired: the test checks the signing pipeline, not the certificate's validity date.
  execFileSync("node", [APPLE, "blue_card", "--root", FIXTURES, "--out", out, "--allow-expired"], { stdio: "pipe" });
  const manifest = JSON.parse(fs.readFileSync(path.join(out, "manifest.json"), "utf8"));
  for (const file of ["pass.json", "icon.png", "icon@2x.png", "logo.png", "strip.png", "strip@2x.png", "strip@3x.png"]) {
    const line = execFileSync("openssl", ["sha1", path.join(out, file)]).toString().trim(); // SHA1(path)= hash
    assert.equal(manifest[file], line.split("= ")[1], file);
  }
  assert.ok(!("manifest.json" in manifest) && !("signature" in manifest));
  execFileSync("openssl", ["smime", "-verify", "-inform", "DER", "-in", path.join(out, "signature"), "-content", path.join(out, "manifest.json"), "-noverify"], { stdio: "pipe" });
});

test("Apple generator refuses to sign with an expired certificate unless told to", needsChromeAndCerts, () => {
  const cert = path.join(certsDir, "signerCert.pem");
  let expired = false;
  try { execFileSync("openssl", ["x509", "-in", cert, "-noout", "-checkend", "0"], { stdio: "ignore" }); } catch { expired = true; }
  if (!expired) return; // only meaningful while the certificate is expired
  const out = path.join(tmp(), "never.pass");
  const r = spawnSync("node", [APPLE, "blue_card", "--root", FIXTURES, "--out", out], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /expired on/);
  assert.ok(!fs.existsSync(out));
});

test("Google generator builds a class for a new design", needsChrome, () => {
  const out = path.join(tmp(), "blue_card");
  execFileSync("node", [GOOGLE, "blue_card", "--root", FIXTURES, "--out", out]);
  const look = JSON.parse(fs.readFileSync(path.join(out, "look.json"), "utf8"));
  assert.equal(look.hexBackgroundColor, "#1a3c8f");
  assert.ok(JSON.parse(fs.readFileSync(path.join(out, "class.json"), "utf8")).id.endsWith("membership_blue_card"));
  assert.deepEqual(readPngSize(path.join(out, "hero.png")), { width: 1032, height: 336 });
  assert.deepEqual(readPngSize(path.join(out, "logo.png")), { width: 660, height: 660 });
  // The logo is a transparent PNG (RGBA, color type 6): the Apple logo centred on a square.
  assert.equal(fs.readFileSync(path.join(out, "logo.png"))[25], 6);
});

test("re-running gives identical output (FR-011)", needsChrome, () => {
  const out = path.join(tmp(), "blue_card.pass");
  const run = () => execFileSync("node", [APPLE, "blue_card", "--root", FIXTURES, "--out", out, "--no-sign"]);
  const snapshot = () =>
    Object.fromEntries(fs.readdirSync(out).sort().map((f) => [f, fs.readFileSync(path.join(out, f)).toString("base64")]));
  run();
  const first = snapshot();
  run();
  assert.deepEqual(snapshot(), first);
});

test("a failed run leaves existing output untouched and reports available designs", () => {
  const out = path.join(tmp(), "keep.pass");
  fs.mkdirSync(out);
  fs.writeFileSync(path.join(out, "marker.txt"), "keep");
  const r = spawnSync("node", [APPLE, "missing_card", "--root", FIXTURES, "--out", out], { encoding: "utf8" });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /missing_card\.html/);
  assert.match(r.stderr, /Available designs: blue_card/);
  assert.equal(fs.readFileSync(path.join(out, "marker.txt"), "utf8"), "keep");
});

test("--list and no-argument usage", () => {
  const list = spawnSync("node", [GOOGLE, "--list", "--root", FIXTURES], { encoding: "utf8" });
  assert.equal(list.status, 0);
  assert.match(list.stdout, /Available designs: blue_card/);
  const none = spawnSync("node", [APPLE, "--root", FIXTURES], { encoding: "utf8" });
  assert.equal(none.status, 1);
  assert.match(none.stdout, /Usage:/);
});
