"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const Database = require("better-sqlite3");
const { nextCardNumber } = require("../../services/cardNumber");

function makeDb(numbers = []) {
  const db = new Database(":memory:");
  db.exec("CREATE TABLE member_card (id INTEGER PRIMARY KEY, card_number INTEGER)");
  const ins = db.prepare("INSERT INTO member_card (card_number) VALUES (?)");
  numbers.forEach((n) => ins.run(n));
  return db;
}

test("empty range starts at the base", () => {
  const db = makeDb();
  assert.equal(nextCardNumber(db, 5), 5000001);
  assert.equal(nextCardNumber(db, 7), 7000001);
});

test("existing max is incremented", () => {
  const db = makeDb([5000010, 5000042, 7000003]);
  assert.equal(nextCardNumber(db, 5), 5000043);
  assert.equal(nextCardNumber(db, 7), 7000004);
});

test("other prefixes and null numbers are ignored", () => {
  const db = makeDb([9000000, null]);
  assert.equal(nextCardNumber(db, 5), 5000001);
  assert.equal(nextCardNumber(db, 7), 7000001);
});
