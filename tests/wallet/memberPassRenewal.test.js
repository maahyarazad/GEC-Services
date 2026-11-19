"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { planMemberPass, toSqlDateTime, datePart } = require("../../services/memberPassRenewal");

const NOW = new Date(2026, 10, 19, 12, 0, 0); // 19 Nov 2026, local time

test("datePart reads SQL strings, ISO strings and Dates", () => {
  assert.equal(datePart("2027-06-04 12:22:22"), "2027-06-04");
  assert.equal(datePart("2027-06-04T00:00:00.000Z"), "2027-06-04");
  assert.equal(datePart(new Date(Date.UTC(2027, 5, 4, 1))), "2027-06-04");
  assert.equal(datePart(null), null);
  assert.equal(datePart("garbage"), null);
});

test("expired in an earlier month: renewed for one year and a new pass is needed", () => {
  const plan = planMemberPass({ memberRow: { card_expiry_date: "2026-05-14 00:00:00", serial_number: "GEC-OLD", pass_expiry_date: "2026-05-14 00:00:00" }, now: NOW });
  assert.equal(plan.renewed, true);
  assert.equal(plan.needsNewPass, true);
  assert.equal(plan.reason, "expired-renewed");
  assert.equal(plan.expiry.getFullYear(), 2027);
  assert.equal(plan.expirySql, toSqlDateTime(plan.expiry));
});

test("expired earlier this month still counts as valid (valid through the end of the month)", () => {
  const plan = planMemberPass({ memberRow: { card_expiry_date: "2026-11-05 00:00:00", serial_number: "GEC-1", pass_expiry_date: "2026-11-05 00:00:00" }, now: NOW });
  assert.equal(plan.needsNewPass, false);
  assert.equal(plan.renewed, false);
});

test("expired last month is renewed (month boundary)", () => {
  const plan = planMemberPass({ memberRow: { card_expiry_date: "2026-10-31 23:59:59", serial_number: "GEC-1", pass_expiry_date: "2026-10-31 23:59:59" }, now: NOW });
  assert.equal(plan.renewed, true);
});

test("a missing or invalid expiry is treated as expired", () => {
  assert.equal(planMemberPass({ memberRow: { card_expiry_date: null, serial_number: "GEC-1" }, now: NOW }).renewed, true);
  assert.equal(planMemberPass({ memberRow: { card_expiry_date: "nope", serial_number: "GEC-1" }, now: NOW }).renewed, true);
});

test("valid card without a serial number gets its first pass with the stored expiry", () => {
  const plan = planMemberPass({ memberRow: { card_expiry_date: "2027-06-04 12:22:22", serial_number: null }, now: NOW });
  assert.equal(plan.needsNewPass, true);
  assert.equal(plan.renewed, false);
  assert.equal(plan.reason, "no-serial");
  assert.equal(plan.expirySql, "2027-06-04 12:22:22");
});

test("expiry moved to a new future date after the pass was issued: new pass", () => {
  const plan = planMemberPass({ memberRow: { card_expiry_date: "2027-11-19 10:00:00", serial_number: "GEC-1", pass_expiry_date: "2026-12-01 00:00:00" }, now: NOW });
  assert.equal(plan.needsNewPass, true);
  assert.equal(plan.renewed, false);
  assert.equal(plan.reason, "expiry-changed");
  assert.equal(plan.expirySql, "2027-11-19 10:00:00");
});

test("pass expiry matches the stored expiry (time of day ignored): nothing to do", () => {
  const plan = planMemberPass({ memberRow: { card_expiry_date: "2027-06-04 12:22:22", serial_number: "GEC-1", pass_expiry_date: "2027-06-04 00:00:00" }, now: NOW });
  assert.equal(plan.needsNewPass, false);
  assert.equal(plan.reason, "current");
});

test("unknown pass expiry (column missing or not filled): the pass is assumed current", () => {
  assert.equal(planMemberPass({ memberRow: { card_expiry_date: "2027-06-04 12:22:22", serial_number: "GEC-1" }, now: NOW }).needsNewPass, false);
  assert.equal(planMemberPass({ memberRow: { card_expiry_date: "2027-06-04 12:22:22", serial_number: "GEC-1", pass_expiry_date: null }, now: NOW }).needsNewPass, false);
});

test("after a renewal is saved, the next call does nothing", () => {
  const first = planMemberPass({ memberRow: { card_expiry_date: "2026-05-14 00:00:00", serial_number: "GEC-OLD", pass_expiry_date: "2026-05-14 00:00:00" }, now: NOW });
  const saved = { card_expiry_date: first.expirySql, serial_number: "GEC-NEW", pass_expiry_date: first.expirySql };
  const second = planMemberPass({ memberRow: saved, now: NOW });
  assert.equal(second.needsNewPass, false);
  assert.equal(second.renewed, false);
});
