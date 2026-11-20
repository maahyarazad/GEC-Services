"use strict";

// The partners an admin can choose when adding a member (Admin Panel > Member Management > Add Member).
// Read from the GEC Services MySQL (table web_partner) through the MySQL pool.

const { FAMILY_PARTNER } = require("./memberPassLayout");

// web_partner.status is ENUM('0','1'). Compare it with the STRING '1': the number 1 would be read as the
// enum INDEX 1, which is the value '0' (inactive). routes/otp.js (fetchPartnerFromGEC) uses '1' as well.
// A partner is active while status is '1' and its period (time + duration years) has not ended.
// MAX(wp.id) keeps the id deterministic: the server runs without ONLY_FULL_GROUP_BY.
const ACTIVE_PARTNERS_SQL = `
  SELECT MAX(wp.id) AS id, wp.title
  FROM web_partner wp
  WHERE wp.status = '1'
    AND wp.time IS NOT NULL
    AND DATE_ADD(wp.time, INTERVAL wp.duration YEAR) >= CURDATE()
  GROUP BY wp.title
  ORDER BY id DESC
`;

// Always offered, always first. It is not returned by the query (its web_partner row has status '0'),
// and the member pass rules look for exactly this title (services/memberPassLayout.js).
const PINNED_PARTNERS = [{ id: 1719, title: FAMILY_PARTNER }];

const fold = (title) => String(title ?? "").trim().toLowerCase();

// Pinned partners first, then the query rows in the order given. Blank titles and repeated titles
// (ignoring capitals and spaces) are dropped, so the family partner is never listed twice.
function buildPartnerOptions(rows) {
  const seen = new Set();
  const options = [];
  for (const row of [...PINNED_PARTNERS, ...(rows ?? [])]) {
    const title = String(row?.title ?? "").trim();
    const key = fold(title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    options.push({ id: row.id, title });
  }
  return options;
}

module.exports = { ACTIVE_PARTNERS_SQL, PINNED_PARTNERS, buildPartnerOptions };
