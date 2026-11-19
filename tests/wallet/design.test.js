"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { listDesigns, loadDesign } = require("../../scripts/wallet/lib/design");

function tempRoot(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "design-test-"));
  for (const [name, content] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), content);
  return dir;
}

const html = (vars) => `<html><head><style>:root{${vars}}</style></head><body><div class="cardLabel">My Label</div></body></html>`;

test("listDesigns returns *_card.html designs and skips the legacy red_card", () => {
  const root = tempRoot({
    "corporate_card.html": html("--red:#9d1d1d;--gold:#dfab3c"),
    "family_card.html": html("--red:#139038;--gold:#dfab3c"),
    "red_card.html": html("--red:#f00;--gold:#dfab3c"),
    "newsletter.html": "<html></html>",
  });
  assert.deepEqual(listDesigns(root), ["corporate_card", "family_card"]);
});

test("loadDesign reads colors and label, with default foreground", () => {
  const root = tempRoot({ "a_card.html": html("--red:#ABC;--gold: #dfab3c") });
  const d = loadDesign("a_card", root);
  assert.equal(d.name, "a_card");
  assert.equal(d.backgroundColor, "#aabbcc");
  assert.equal(d.accentColor, "#dfab3c");
  assert.equal(d.foregroundColor, "#ffffff");
  assert.equal(d.label, "My Label");
});

test("loadDesign honours --fg and accepts a name with .html", () => {
  const root = tempRoot({ "a_card.html": html("--red:#000000;--gold:#dfab3c;--fg:#eeeeee") });
  assert.equal(loadDesign("a_card.html", root).foregroundColor, "#eeeeee");
});

test("loadDesign rejects invalid names", () => {
  const root = tempRoot({ "a_card.html": html("--red:#000;--gold:#fff") });
  assert.throws(() => loadDesign("../etc/passwd", root), /Invalid design name/);
  assert.throws(() => loadDesign("A_Card", root), /Invalid design name/);
});

test("loadDesign names the missing file and lists available designs", () => {
  const root = tempRoot({ "a_card.html": html("--red:#000;--gold:#fff") });
  assert.throws(() => loadDesign("nope_card", root), (e) => /nope_card\.html/.test(e.message) && /a_card/.test(e.message));
});

test("loadDesign reports a missing or invalid background / accent color", () => {
  const root = tempRoot({
    "nored_card.html": html("--gold:#dfab3c"),
    "nogold_card.html": html("--red:#000"),
    "bad_card.html": html("--red:blue;--gold:#dfab3c"),
  });
  assert.throws(() => loadDesign("nored_card", root), /--red/);
  assert.throws(() => loadDesign("nogold_card", root), /--gold/);
  assert.throws(() => loadDesign("bad_card", root), /hex color/);
});

test("the repository designs are valid", () => {
  const corporate = loadDesign("corporate_card");
  const family = loadDesign("family_card");
  assert.equal(corporate.backgroundColor, "#9d1d1d");
  assert.equal(family.backgroundColor, "#139038");
  assert.equal(corporate.accentColor, "#dfab3c");
});
