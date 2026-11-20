"use strict";

// Partner list for the Add Member dialog: services/partnerList.js and GET /api/active-partners.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Database = require("better-sqlite3");
const express = require("express");

const ROOT = path.resolve(__dirname, "../..");
const { ACTIVE_PARTNERS_SQL, PINNED_PARTNERS, buildPartnerOptions } = require(path.join(ROOT, "services/partnerList"));

test("the family partner (web_partner id 1719) is pinned", () => {
  assert.deepEqual(PINNED_PARTNERS, [{ id: 1719, title: "GEC Family Membership" }]);
});

test("query: status is compared with the string '1' (the column is ENUM('0','1')), only partners still running", () => {
  assert.match(ACTIVE_PARTNERS_SQL, /wp\.status\s*=\s*'1'/);
  assert.doesNotMatch(ACTIVE_PARTNERS_SQL, /wp\.status\s*=\s*1\b/); // the number 1 would match the enum index = '0'
  assert.match(ACTIVE_PARTNERS_SQL, /DATE_ADD\(wp\.time, INTERVAL wp\.duration YEAR\)\s*>=\s*CURDATE\(\)/);
  assert.match(ACTIVE_PARTNERS_SQL, /MAX\(wp\.id\) AS id/);
  assert.match(ACTIVE_PARTNERS_SQL, /GROUP BY wp\.title/);
});

test("pinned partner comes first, then the query rows in their order", () => {
  const out = buildPartnerOptions([{ id: 30, title: "Zeta" }, { id: 20, title: "Alpha" }]);
  assert.deepEqual(out, [{ id: 1719, title: "GEC Family Membership" }, { id: 30, title: "Zeta" }, { id: 20, title: "Alpha" }]);
});

test("the family partner is not listed twice, whatever its capitals or spaces", () => {
  const out = buildPartnerOptions([{ id: 5, title: "A" }, { id: 9, title: " gec family membership " }]);
  assert.deepEqual(out.map((o) => o.title), ["GEC Family Membership", "A"]);
  assert.equal(out[0].id, 1719);
});

test("blank titles and repeated titles are dropped, titles are trimmed", () => {
  const out = buildPartnerOptions([{ id: 1, title: "" }, { id: 2, title: "   " }, { id: 3, title: null }, { id: 4, title: " ACME " }, { id: 5, title: "acme" }]);
  assert.deepEqual(out.map((o) => o.title), ["GEC Family Membership", "ACME"]);
});

test("no rows (or undefined) still gives the pinned partner", () => {
  assert.deepEqual(buildPartnerOptions([]), PINNED_PARTNERS);
  assert.deepEqual(buildPartnerOptions(undefined), PINNED_PARTNERS);
});

// ── The real route, with MySQL and SQLite stubbed ──────────────────────────
let mysqlRows = [];
let mysqlFails = false;
const queries = [];

const stub = (modulePath, exports) => {
  const p = require.resolve(path.join(ROOT, modulePath));
  require.cache[p] = { id: p, filename: p, loaded: true, exports };
};
stub("services/dbService", { getDB: () => new Database(":memory:") });
stub("services/mysqlService", {
  getPool: () => ({
    query: async (sql) => {
      queries.push(sql);
      if (mysqlFails) throw new Error("mysql down");
      return [mysqlRows, []];
    },
  }),
});
const router = require(path.join(ROOT, "routes/member_card.js"));

let server;
let base;
test.before(async () => {
  const app = express();
  app.use(router);
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

test("GET /api/active-partners: family partner on top, then the MySQL rows", async () => {
  mysqlRows = [{ id: 1500, title: "ACME" }, { id: 1400, title: "Beta GmbH" }];
  const r = await fetch(`${base}/api/active-partners`);
  const body = await r.json();
  assert.equal(r.status, 200);
  assert.equal(body.status, true);
  assert.deepEqual(body.data.map((o) => o.title), ["GEC Family Membership", "ACME", "Beta GmbH"]);
  assert.equal(body.data[0].id, 1719);
  assert.equal(queries.at(-1), ACTIVE_PARTNERS_SQL);
});

test("GET /api/active-partners: a MySQL error gives 500 and no stack trace", async () => {
  mysqlFails = true;
  const orig = console.error;
  console.error = () => {};
  try {
    const r = await fetch(`${base}/api/active-partners`);
    const body = await r.json();
    assert.equal(r.status, 500);
    assert.deepEqual(body, { status: false, message: "Server error" });
  } finally {
    console.error = orig;
    mysqlFails = false;
  }
});
