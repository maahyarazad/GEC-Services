"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildGoogleMemberPass } = require("../../services/googleMemberPass");

const EXPIRATION = new Date(Date.UTC(2027, 2, 24, 10, 0, 0));
const build = (partner, dataOver = {}) =>
  buildGoogleMemberPass({
    data: { firstname: "Ana", lastname: "Lopez", memberId: "1774354016162", serial_number: "GEC-1", partner, formattedExpiry: "24-03-2027", ...dataOver },
    issuerId: "123",
    assetBaseUrl: "https://x/uploads",
    qrValue: "https://app.example/guest-registration/corporate-card?guest-code=GEC-1",
    expirationDate: EXPIRATION,
    now: new Date(Date.UTC(2026, 10, 19, 12, 0, 0)),
  });
const textValue = (obj) => obj.defaultValue.value;

test("corporate partner: corporate class, red, label, images", () => {
  const { genericClass, genericObject } = build("ACME");
  assert.equal(genericClass.id, "123.membership_corporate_card");
  assert.equal(genericObject.classId, "123.membership_corporate_card");
  assert.equal(genericObject.hexBackgroundColor, "#9d1d1d");
  assert.equal(textValue(genericObject.cardTitle), "Corporate Card - ACME");
  assert.equal(genericObject.heroImage.sourceUri.uri, "https://x/uploads/wallet/corporate_card-hero.png");
  assert.equal(genericObject.logo.sourceUri.uri, "https://x/uploads/wallet/logo.png");
  assert.equal(genericObject.state, "active");
});

test("family partner (any case/spacing): family class, green, label, hero", () => {
  for (const p of ["GEC Family Membership", " gec family membership "]) {
    const { genericClass, genericObject } = build(p);
    assert.equal(genericClass.id, "123.membership_family_card");
    assert.equal(genericObject.hexBackgroundColor, "#139038");
    assert.equal(textValue(genericObject.cardTitle), "GEC Family Membership");
    assert.equal(genericObject.heroImage.sourceUri.uri, "https://x/uploads/wallet/family_card-hero.png");
    assert.equal(genericObject.logo.sourceUri.uri, "https://x/uploads/wallet/logo.png");
  }
});

test("empty or missing partner: plain 'Corporate Card' on the corporate class", () => {
  for (const p of ["", null, undefined]) {
    const { genericClass, genericObject } = build(p);
    assert.equal(textValue(genericObject.cardTitle), "Corporate Card");
    assert.equal(genericClass.id, "123.membership_corporate_card");
  }
});

test("header is the fixed text and there is no Name subheader", () => {
  const { genericObject } = build("ACME");
  assert.equal(textValue(genericObject.header), "Membership Pass");
  assert.equal(genericObject.subheader, undefined);
});

test("text modules: expiry, member id, name, serial; no partner", () => {
  const { genericObject } = build("ACME");
  const mods = genericObject.textModulesData;
  assert.deepEqual(mods.map((m) => m.id), ["expiry", "cardnumber", "name", "serialNumber"]);
  assert.deepEqual(mods[0], { id: "expiry", header: "Expiry Date", body: "24-03-2027" });
  assert.deepEqual(mods[1], { id: "cardnumber", header: "Member ID", body: "1774354016162" });
  assert.deepEqual(mods[2], { id: "name", header: "Name", body: "Ana Lopez" });
  assert.equal(mods[3].body, "GEC-1");
  assert.ok(!JSON.stringify(genericObject).includes("Corporate Partner"));
  assert.ok(!mods.some((m) => m.id === "partner"));
});

test("class has only id and the row template: three items then the serial number", () => {
  const { genericClass } = build("ACME");
  assert.deepEqual(Object.keys(genericClass).sort(), ["classTemplateInfo", "id"]);
  const rows = genericClass.classTemplateInfo.cardTemplateOverride.cardRowTemplateInfos;
  assert.equal(rows.length, 2);
  const path = (item) => item.firstValue.fields[0].fieldPath;
  assert.equal(path(rows[0].threeItems.startItem), 'object.textModulesData["expiry"].body');
  assert.equal(path(rows[0].threeItems.middleItem), 'object.textModulesData["cardnumber"].body');
  assert.equal(path(rows[0].threeItems.endItem), 'object.textModulesData["name"].body');
  assert.equal(path(rows[1].oneItem.item), 'object.textModulesData["serialNumber"].body');
});

test("barcode and validity", () => {
  const { genericObject } = build("ACME");
  assert.deepEqual(genericObject.barcode, { type: "QR_CODE", value: "https://app.example/guest-registration/corporate-card?guest-code=GEC-1" });
  assert.equal(genericObject.validTimeInterval.start.date, "2026-11-19T12:00:00.000Z");
  assert.equal(genericObject.validTimeInterval.end.date, EXPIRATION.toISOString());
});

test("missing last name gives just the first name", () => {
  const { genericObject } = build("ACME", { lastname: null });
  const name = genericObject.textModulesData.find((m) => m.id === "name").body;
  assert.equal(name, "Ana");
  assert.ok(!/undefined|null/.test(name));
});
