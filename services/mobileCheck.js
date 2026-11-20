"use strict";

// Rules of POST /members/mobile-check: which answer a phone number gets.
// Pure functions (no database or Express here) so they can be tested on their own.
//
// The query returns EVERY card with the phone number, with is_expired worked out in SQL (a card is
// valid through the end of its expiry month, the same rule as services/memberPassRenewal.js).
// The state of each card is then decided here, so the answer can say what is wrong:
//   valid    -> member_found
//   no_pass  -> active, but no serial number (no Virtual Pass yet)
//   expired  -> active, has a serial number, expiry month is over
//   inactive -> active is not 1
//   (none)   -> not_found
// With several cards on one number the first of this list wins: valid, no_pass, expired, inactive.

const { datePart } = require("./memberPassRenewal");

const MOBILE_CHECK_SQL = `
  SELECT *,
    CASE WHEN DATE('now') <= DATE(mc.card_expiry_date, 'start of month', '+1 month', '-1 day')
      THEN 0 ELSE 1 END AS is_expired
  FROM member_card mc
  WHERE mc.mobile_number = ?
`;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const MOBILE_CHECK_MESSAGES = {
  memberFound: "Member found",
  noPass:
    "We found your account, but you don't have a Virtual Pass yet. Please go to the GEC Services Web Application and get your Virtual Pass.",
  inactive: "Your account is currently inactive. Please contact your HR department to have it reactivated.",
  // monthYear is e.g. "March 2026", or null when the card has no usable expiry date.
  expired: (monthYear) =>
    monthYear
      ? `Your member card expired in ${monthYear}. Please contact your HR department to renew it.`
      : "Your member card has expired. Please contact your HR department to renew it.",
  notFound:
    "We couldn't find an account for this phone number. Please check the number and try again, or contact your HR department if you think this is a mistake.",
};

function memberCardState(row) {
  if (Number(row.active) !== 1) return "inactive";
  if (String(row.serial_number ?? "").trim() === "") return "no_pass";
  if (Number(row.is_expired) === 1) return "expired";
  return "valid";
}

// "March 2026" for the latest card_expiry_date among the rows, or null when none has a valid date.
function latestExpiryMonthYear(rows) {
  const days = rows.map((r) => datePart(r.card_expiry_date)).filter(Boolean).sort();
  if (days.length === 0) return null;
  const latest = days[days.length - 1];
  return `${MONTHS[Number(latest.slice(5, 7)) - 1]} ${latest.slice(0, 4)}`;
}

// Returns { httpStatus, body }. Only member_found and expired carry the card rows (data), as before.
function classifyMobileCheck(rows) {
  const byState = { valid: [], no_pass: [], expired: [], inactive: [] };
  for (const row of rows) byState[memberCardState(row)].push(row);

  if (byState.valid.length > 0) {
    return {
      httpStatus: 200,
      body: { status: true, code: "member_found", message: MOBILE_CHECK_MESSAGES.memberFound, count: byState.valid.length, data: byState.valid },
    };
  }
  if (byState.no_pass.length > 0) {
    return {
      httpStatus: 404,
      body: { status: false, code: "no_pass", message: MOBILE_CHECK_MESSAGES.noPass, count: byState.no_pass.length },
    };
  }
  if (byState.expired.length > 0) {
    return {
      httpStatus: 404,
      body: {
        status: false,
        expired: true,
        code: "expired",
        message: MOBILE_CHECK_MESSAGES.expired(latestExpiryMonthYear(byState.expired)),
        count: byState.expired.length,
        data: byState.expired,
      },
    };
  }
  if (byState.inactive.length > 0) {
    return {
      httpStatus: 404,
      body: { status: false, code: "inactive", message: MOBILE_CHECK_MESSAGES.inactive, count: byState.inactive.length },
    };
  }
  return { httpStatus: 404, body: { status: false, code: "not_found", message: MOBILE_CHECK_MESSAGES.notFound } };
}

// Keeps the last four characters, so the log shows which number without exposing it.
function maskMobile(digits) {
  const s = String(digits ?? "");
  return s.length <= 4 ? "*".repeat(s.length) : "*".repeat(s.length - 4) + s.slice(-4);
}

module.exports = { MOBILE_CHECK_SQL, MOBILE_CHECK_MESSAGES, memberCardState, classifyMobileCheck, maskMobile };
