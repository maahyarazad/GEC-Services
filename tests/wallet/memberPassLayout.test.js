"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadDesign } = require("../../scripts/wallet/lib/design");
const {
  DESIGN_COLORS,
  FAMILY_PARTNER, isFamilyPartner, modelNameFor, designNameFor, passLabelFor, buildHeaderFields, buildMemberFields,
} = require("../../services/memberPassLayout");

// Apple pass only: the label sits at the right end of the header, right-aligned (not beside the logo).
// Uses FAMILY_PARTNER, not a literal, so it does not depend on how the family partner is spelled.
test("buildHeaderFields: one right-aligned header field with the pass label", () => {
  assert.deepEqual(buildHeaderFields("ACME"), [{ key: "card", value: "Corporate Card - ACME", textAlignment: "PKTextAlignmentRight" }]);
  assert.equal(buildHeaderFields(FAMILY_PARTNER)[0].value, passLabelFor(FAMILY_PARTNER));
  assert.equal(buildHeaderFields(` ${FAMILY_PARTNER.toLowerCase()} `)[0].value, FAMILY_PARTNER);
  for (const none of ["", "  ", null, undefined]) assert.equal(buildHeaderFields(none)[0].value, "Corporate Card");
  assert.equal("label" in buildHeaderFields("ACME")[0], false); // no small heading above the text
});

test("isFamilyPartner ignores case and surrounding spaces", () => {
  assert.equal(FAMILY_PARTNER, "GEC Family Membership");
  assert.equal(isFamilyPartner("GEC Family Membership"), true);
  assert.equal(isFamilyPartner("  gec family membership "), true);
  for (const other of ["ACME", "GEC Family", "", "   ", null, undefined]) assert.equal(isFamilyPartner(other), false, String(other));
});

test("modelNameFor and designNameFor pick the family or corporate design", () => {
  assert.equal(modelNameFor("GEC Family Membership"), "family_card.pass");
  assert.equal(designNameFor("GEC Family Membership"), "family_card");
  assert.equal(modelNameFor("ACME"), "corporate_card.pass");
  assert.equal(designNameFor(undefined), "corporate_card");
});

test("passLabelFor", () => {
  assert.equal(passLabelFor("ACME"), "Corporate Card - ACME");
  assert.equal(passLabelFor("  ACME "), "Corporate Card - ACME");
  assert.equal(passLabelFor("GEC Family Membership"), "GEC Family Membership");
  assert.equal(passLabelFor(" gec family membership"), "GEC Family Membership");
  assert.equal(passLabelFor(""), "Corporate Card");
  assert.equal(passLabelFor(null), "Corporate Card");
});

test("buildMemberFields: no primary field, Expiry secondary, Member ID then Name auxiliary", () => {
  const f = buildMemberFields({ firstname: "Ana", lastname: "Lopez", memberId: "123", expiry: "24-03-2027" });
  assert.deepEqual(f.primaryFields, []);
  assert.deepEqual(f.secondaryFields, [{ key: "expiry", label: "Expiry Date", value: "24-03-2027" }]);
  assert.equal(f.auxiliaryFields.length, 2);
  assert.deepEqual(f.auxiliaryFields[0], { key: "memberId", label: "Member ID", value: "123", textAlignment: "PKTextAlignmentLeft" });
  assert.deepEqual(f.auxiliaryFields[1], { key: "name", label: "Name", value: "Ana Lopez", textAlignment: "PKTextAlignmentRight" });
  assert.ok(!JSON.stringify(f).includes("Corporate Partner"));
});

test("buildMemberFields copes with missing names", () => {
  const only = buildMemberFields({ firstname: "Ana", lastname: null, memberId: 1, expiry: "x" }).auxiliaryFields[1].value;
  assert.equal(only, "Ana");
  const none = buildMemberFields({ memberId: 1, expiry: "x" }).auxiliaryFields[1].value;
  assert.equal(none, "");
  assert.ok(!/undefined|null/.test(only + none));
});

test("DESIGN_COLORS match the design HTML files (the server does not have those files)", () => {
  for (const name of ["corporate_card", "family_card"]) {
    const d = loadDesign(name);
    assert.equal(DESIGN_COLORS[name].backgroundColor, d.backgroundColor, `${name} background`);
    assert.equal(DESIGN_COLORS[name].accentColor, d.accentColor, `${name} accent`);
  }
});
