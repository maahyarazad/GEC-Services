"use strict";

// Decides whether /member-pass must issue new wallet passes for a member, and with which expiry.
//
// A card is valid through the end of its expiry month (same rule as /members/mobile-check).
// New passes are needed when:
//   - the member has no serial number yet,
//   - the card expired in an earlier month (renewed for one year from today), or
//   - the stored expiry no longer matches the expiry baked into the issued pass
//     (pass_expiry_date), e.g. an admin or the sync moved card_expiry_date.

const pad = (n) => String(n).padStart(2, "0");

// "YYYY-MM-DD HH:MM:SS" (UTC), the format SQLite's datetime('now') produces.
function toSqlDateTime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

// "YYYY-MM-DD" from a stored string, or from a Date (UTC); null when missing or invalid.
function datePart(value) {
  if (value instanceof Date) return isNaN(value) ? null : toSqlDateTime(value).slice(0, 10);
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(value ?? ""));
  return m ? m[1] : null;
}

function planMemberPass({ memberRow, now = new Date() }) {
  const storedExpiry = memberRow.card_expiry_date;
  const storedDay = datePart(storedExpiry);
  const currentMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const expired = !storedDay || storedDay.slice(0, 7) < currentMonth;

  if (expired) {
    const expiry = new Date(now);
    expiry.setFullYear(expiry.getFullYear() + 1);
    return { expiry, expirySql: toSqlDateTime(expiry), renewed: true, needsNewPass: true, reason: "expired-renewed" };
  }

  const expiry = new Date(storedExpiry);
  const expirySql = String(storedExpiry);

  if (!memberRow.serial_number) {
    return { expiry, expirySql, renewed: false, needsNewPass: true, reason: "no-serial" };
  }

  const passDay = datePart(memberRow.pass_expiry_date);
  if (passDay && passDay !== storedDay) {
    return { expiry, expirySql, renewed: false, needsNewPass: true, reason: "expiry-changed" };
  }

  return { expiry, expirySql, renewed: false, needsNewPass: false, reason: "current" };
}

module.exports = { planMemberPass, toSqlDateTime, datePart };
