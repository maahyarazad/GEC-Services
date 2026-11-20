"use strict";

// Rules and query of POST /members/mobile-check (services/mobileCheck.js).
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Database = require("better-sqlite3");

const { MOBILE_CHECK_SQL, MOBILE_CHECK_MESSAGES, memberCardState, classifyMobileCheck, maskMobile } = require(path.resolve(__dirname, "../../services/mobileCheck"));

const card = (extra) => ({ id: 1, active: 1, serial_number: "GEC-1", is_expired: 0, card_expiry_date: "2030-01-15 00:00:00", ...extra });

test("memberCardState: inactive wins, then no pass, then expired, then valid", () => {
  for (const active of [0, null, undefined, "0"]) assert.equal(memberCardState(card({ active })), "inactive");
  assert.equal(memberCardState(card({ active: 0, serial_number: null })), "inactive");
  for (const serial_number of [null, "", "   "]) assert.equal(memberCardState(card({ serial_number })), "no_pass");
  assert.equal(memberCardState(card({ is_expired: 1 })), "expired");
  assert.equal(memberCardState(card({ serial_number: null, is_expired: 1 })), "no_pass");
  assert.equal(memberCardState(card()), "valid");
});

test("no card: 404 not_found, no data", () => {
  const { httpStatus, body } = classifyMobileCheck([]);
  assert.equal(httpStatus, 404);
  assert.equal(body.status, false);
  assert.equal(body.code, "not_found");
  assert.equal(body.message, MOBILE_CHECK_MESSAGES.notFound);
  assert.match(body.message, /phone number/);
  assert.equal("data" in body, false);
});

test("valid card: same answer as before plus code; expired cards are left out of data", () => {
  const valid = card();
  const { httpStatus, body } = classifyMobileCheck([card({ id: 2, is_expired: 1 }), valid]);
  assert.equal(httpStatus, 200);
  assert.deepEqual(body, { status: true, code: "member_found", message: "Member found", count: 1, data: [valid] });
});

test("no serial number: 404, no_pass, tells the member to get the Virtual Pass, no data", () => {
  const { httpStatus, body } = classifyMobileCheck([card({ serial_number: null })]);
  assert.equal(httpStatus, 404);
  assert.equal(body.status, false);
  assert.equal(body.code, "no_pass");
  assert.equal(body.count, 1);
  assert.match(body.message, /GEC Services Web Application/);
  assert.match(body.message, /Virtual Pass/);
  assert.equal("data" in body, false);
  assert.equal("expired" in body, false);
});

test("inactive: 404, inactive, mentions HR, no data", () => {
  const { httpStatus, body } = classifyMobileCheck([card({ active: 0 })]);
  assert.equal(httpStatus, 404);
  assert.equal(body.status, false);
  assert.equal(body.code, "inactive");
  assert.match(body.message, /inactive/);
  assert.match(body.message, /HR/);
  assert.equal("data" in body, false);
});

test("expired: 404, expired true, names the month and year of the latest expired card, keeps data", () => {
  const a = card({ id: 1, is_expired: 1, card_expiry_date: "2025-12-01 00:00:00" });
  const b = card({ id: 2, is_expired: 1, card_expiry_date: "2026-03-15 00:00:00" });
  const { httpStatus, body } = classifyMobileCheck([a, b]);
  assert.equal(httpStatus, 404);
  assert.equal(body.status, false);
  assert.equal(body.expired, true);
  assert.equal(body.code, "expired");
  assert.equal(body.count, 2);
  assert.deepEqual(body.data, [a, b]);
  assert.match(body.message, /expired in March 2026/);
});

test("expired with no usable expiry date: generic expired message", () => {
  for (const card_expiry_date of [null, "not a date"]) {
    const { body } = classifyMobileCheck([card({ is_expired: 1, card_expiry_date })]);
    assert.equal(body.code, "expired");
    assert.match(body.message, /^Your member card has expired\./);
  }
});

test("several cards on one number: valid, then no pass, then expired, then inactive, then not found", () => {
  const valid = card({ id: 1 });
  const noPass = card({ id: 2, serial_number: null });
  const expired = card({ id: 3, is_expired: 1 });
  const inactive = card({ id: 4, active: 0 });
  const code = (rows) => classifyMobileCheck(rows).body.code;
  assert.equal(code([inactive, expired, noPass, valid]), "member_found");
  assert.equal(code([inactive, expired, noPass]), "no_pass");
  assert.equal(code([inactive, expired]), "expired");
  assert.equal(code([inactive]), "inactive");
  assert.equal(code([]), "not_found");
});

test("maskMobile keeps only the last four characters", () => {
  assert.equal(maskMobile("971501234567"), "********4567");
  assert.equal(maskMobile("1234"), "****");
  assert.equal(maskMobile("12"), "**");
  assert.equal(maskMobile(""), "");
  assert.equal(maskMobile(null), "");
});

test("query: returns every card of the number (no filter on active or serial_number) with is_expired", () => {
  assert.doesNotMatch(MOBILE_CHECK_SQL, /active\s*=/i);
  assert.doesNotMatch(MOBILE_CHECK_SQL, /IS NOT NULL/i);

  const db = new Database(":memory:");
  db.exec(`CREATE TABLE member_card (id INTEGER PRIMARY KEY, mobile_number TEXT, serial_number TEXT, active BOOLEAN,
    card_expiry_date DATETIME, firstname TEXT, lastname TEXT, email TEXT, partner TEXT)`);
  const insert = db.prepare("INSERT INTO member_card (id, mobile_number, serial_number, active, card_expiry_date) VALUES (?, ?, ?, ?, ?)");
  const future = `${new Date().getFullYear() + 2}-06-15 00:00:00`;
  insert.run(1, "971500000001", "GEC-1", 1, future); // valid
  insert.run(2, "971500000001", "GEC-2", 1, "2000-01-15 00:00:00"); // expired
  insert.run(3, "971500000001", null, 1, future); // no pass
  insert.run(4, "971500000001", "GEC-4", 0, future); // inactive
  insert.run(5, "971500000001", "GEC-5", 1, null); // no expiry date
  insert.run(6, "971500000002", "GEC-6", 1, future); // another number

  const rows = db.prepare(MOBILE_CHECK_SQL).all("971500000001");
  assert.deepEqual(rows.map((r) => r.id).sort(), [1, 2, 3, 4, 5]);
  const expired = Object.fromEntries(rows.map((r) => [r.id, r.is_expired]));
  assert.equal(expired[1], 0);
  assert.equal(expired[2], 1);
  assert.equal(expired[5], 1);
  assert.equal(db.prepare(MOBILE_CHECK_SQL).all("971599999999").length, 0);

  // End to end on the rows: this number has a valid card, so it is found; without it, the best answer is no pass.
  assert.equal(classifyMobileCheck(rows).body.code, "member_found");
  assert.equal(classifyMobileCheck(rows.filter((r) => r.id !== 1)).body.code, "no_pass");
});
