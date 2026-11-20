"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { GOOGLE_SIZES, DEFAULT_ISSUER_ID, buildClass, buildLook } = require("../../scripts/wallet/lib/googleClass");

const design = { name: "family_card", backgroundColor: "#139038", accentColor: "#dfab3c", foregroundColor: "#ffffff" };

test("image sizes", () => {
  assert.deepEqual(GOOGLE_SIZES.hero, { width: 1032, height: 336 });
  assert.deepEqual(GOOGLE_SIZES.logo, { width: 660, height: 660 });
});

test("buildClass id uses the issuer and design name", () => {
  assert.equal(buildClass(design).id, `${DEFAULT_ISSUER_ID}.membership_family_card`);
  assert.equal(buildClass(design, { issuerId: "123" }).id, "123.membership_family_card");
});

test("buildClass has two rows with the card field paths", () => {
  const rows = buildClass(design).classTemplateInfo.cardTemplateOverride.cardRowTemplateInfos;
  assert.equal(rows.length, 2);
  const paths = JSON.stringify(rows);
  for (const key of ["cardnumber", "partner", "expiry", "serialNumber"]) {
    assert.ok(paths.includes(`textModulesData[\\"${key}\\"].body`), key);
  }
});

test("buildClass contains only GenericClass resource fields", () => {
  assert.deepEqual(Object.keys(buildClass(design)).sort(), ["classTemplateInfo", "id"]);
});

test("buildLook carries the design color and image file names", () => {
  const look = buildLook(design);
  assert.equal(look.hexBackgroundColor, "#139038");
  assert.equal(look.heroImageFile, "hero.png");
  assert.equal(look.logoFile, "logo.png");
  assert.equal(look.classId, buildClass(design).id);
});
