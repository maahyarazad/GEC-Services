"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ASSET_SIZES, hexToRgb, buildPassJson } = require("../../scripts/wallet/lib/applePass");

const design = { backgroundColor: "#9d1d1d", accentColor: "#dfab3c", foregroundColor: "#ffffff" };
const base = {
  formatVersion: 1,
  passTypeIdentifier: "pass.com.gec.membercard",
  teamIdentifier: "TEAM123",
  organizationName: "CORPORATE CARD",
  generic: { primaryFields: [{ key: "x" }] },
};

test("strip sizes are the same ratio at 1x, 2x and 3x", () => {
  const one = ASSET_SIZES.strip;
  assert.equal(ASSET_SIZES["strip@2x"].width, one.width * 2);
  assert.equal(ASSET_SIZES["strip@2x"].height, one.height * 2);
  assert.equal(ASSET_SIZES["strip@3x"].width, one.width * 3);
  assert.equal(ASSET_SIZES["strip@3x"].height, one.height * 3);
});

test("hexToRgb", () => {
  assert.equal(hexToRgb("#9d1d1d"), "rgb(157, 29, 29)");
  assert.equal(hexToRgb("#fff"), "rgb(255, 255, 255)");
});

test("buildPassJson overrides passTypeIdentifier when given (taken from the certificate)", () => {
  assert.equal(buildPassJson(design, base, { passTypeIdentifier: "pass.com.gec.virtualmembercard" }).passTypeIdentifier, "pass.com.gec.virtualmembercard");
  assert.equal(buildPassJson(design, base).passTypeIdentifier, "pass.com.gec.membercard");
});

test("buildPassJson makes a storeCard pass with the design colors", () => {
  const pass = buildPassJson(design, base);
  assert.equal(pass.generic, undefined);
  assert.deepEqual(pass.storeCard, { primaryFields: [], secondaryFields: [], auxiliaryFields: [], backFields: [] });
  assert.equal(pass.passTypeIdentifier, "pass.com.gec.membercard");
  assert.equal(pass.teamIdentifier, "TEAM123");
  assert.equal(pass.organizationName, "German Emirates Club");
  assert.equal(pass.backgroundColor, "rgb(157, 29, 29)");
  assert.equal(pass.labelColor, "rgb(223, 171, 60)");
  assert.equal(pass.foregroundColor, "rgb(255, 255, 255)");
});
