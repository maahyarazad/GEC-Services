"use strict";

// Corporate member add / edit endpoints, run against an in-memory copy of the schema.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const express = require("express");

const ROOT = path.resolve(__dirname, "../..");
const memdb = new Database(":memory:");
// schema.sql is a full dump; run it statement by statement and skip the few that clash (e.g. duplicate columns).
for (const stmt of fs.readFileSync(path.join(ROOT, "sql_versions/schema.sql"), "utf8").split(/;\s*\n/)) {
  try { memdb.exec(stmt); } catch { /* not needed by these tests */ }
}

// Make routes/partner_onboarding.js use the in-memory database.
const dbServicePath = require.resolve(path.join(ROOT, "services/dbService"));
require.cache[dbServicePath] = { id: dbServicePath, filename: dbServicePath, loaded: true, exports: { getDB: () => memdb } };
const router = require(path.join(ROOT, "routes/partner_onboarding.js"));

let server;
let base;
test.before(async () => {
  const app = express();
  app.use(express.json());
  app.use(router);
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

const call = async (method, url, body) => {
  const r = await fetch(base + url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json() };
};
const row = (id) => memdb.prepare("SELECT * FROM member_card WHERE id = ?").get(id);
const member = { firstname: "Ana", lastname: "Lopez", email: "ana@example.com", partner: "ACME", type: 7 };

test("add with a card expiry date stores it", async () => {
  const r = await call("POST", "/api/partner-onboarding/employee", { ...member, card_expiry_date: "2028-03-15" });
  assert.equal(r.status, 201);
  assert.equal(row(r.body.id).card_expiry_date, "2028-03-15");
});

test("add without an expiry date defaults to one year from today", async () => {
  const r = await call("POST", "/api/partner-onboarding/employee", { ...member, email: "b@example.com" });
  assert.equal(r.status, 201);
  const stored = row(r.body.id).card_expiry_date;
  const expected = new Date();
  expected.setUTCFullYear(expected.getUTCFullYear() + 1);
  assert.equal(stored.slice(0, 4), String(expected.getUTCFullYear()));
});

test("add rejects a badly formatted expiry date", async () => {
  const r = await call("POST", "/api/partner-onboarding/employee", { ...member, card_expiry_date: "15/03/2028" });
  assert.equal(r.status, 400);
  assert.match(r.body.message, /YYYY-MM-DD/);
});

test("edit changes the member and the expiry date in one request", async () => {
  const { body: created } = await call("POST", "/api/partner-onboarding/employee", { ...member, email: "c@example.com", card_expiry_date: "2027-01-01" });
  const r = await call("PUT", `/api/partner-onboarding/employee/${created.id}`, { ...member, email: "c@example.com", firstname: "Anna", card_expiry_date: "2029-02-02" });
  assert.equal(r.status, 200);
  assert.equal(row(created.id).firstname, "Anna");
  assert.equal(row(created.id).card_expiry_date, "2029-02-02");
});

test("edit without card_expiry_date leaves the expiry unchanged", async () => {
  const { body: created } = await call("POST", "/api/partner-onboarding/employee", { ...member, email: "d@example.com", card_expiry_date: "2027-07-07" });
  const r = await call("PUT", `/api/partner-onboarding/employee/${created.id}`, { ...member, email: "d@example.com", lastname: "Garcia" });
  assert.equal(r.status, 200);
  assert.equal(row(created.id).card_expiry_date, "2027-07-07");
});

test("edit with an empty expiry date clears it, an invalid one is rejected", async () => {
  const { body: created } = await call("POST", "/api/partner-onboarding/employee", { ...member, email: "e@example.com", card_expiry_date: "2027-07-07" });
  assert.equal((await call("PUT", `/api/partner-onboarding/employee/${created.id}`, { ...member, email: "e@example.com", card_expiry_date: "" })).status, 200);
  assert.equal(row(created.id).card_expiry_date, null);
  assert.equal((await call("PUT", `/api/partner-onboarding/employee/${created.id}`, { ...member, email: "e@example.com", card_expiry_date: "nope" })).status, 400);
});

test("edit of an unknown member returns 404", async () => {
  const r = await call("PUT", "/api/partner-onboarding/employee/99999", { ...member, card_expiry_date: "2027-01-01" });
  assert.equal(r.status, 404);
});
