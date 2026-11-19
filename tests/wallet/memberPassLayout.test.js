"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  FAMILY_PARTNER, isFamilyPartner, modelNameFor, designNameFor, passLabelFor, buildMemberFields,
} = require("../../services/memberPassLayout");

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
