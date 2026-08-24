const { parsePhoneNumberFromString } = require("libphonenumber-js");
const dbService = require("./dbService");
const db = dbService.getDB();

// ─── DB migration (idempotent — runs once at startup) ────────────────────────
(function runMigrations() {
  const steps = [
    `CREATE TABLE IF NOT EXISTS whatsapp_opt_outs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      phone         TEXT    NOT NULL UNIQUE,
      keyword       TEXT    NOT NULL,
      opted_out_at  INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_whatsapp_opt_outs_phone ON whatsapp_opt_outs (phone)`,
  ];
  for (const sql of steps) {
    try { db.exec(sql); } catch { /* already applied */ }
  }
})();

const OPT_OUT_KEYWORDS = ["STOP", "UNSUBSCRIBE", "CANCEL"];

// Only an exact (trimmed, case-insensitive) match counts — see FR-002 in
// spec.md: substring matches inside longer messages must not opt someone out.
function matchOptOutKeyword(body) {
  if (typeof body !== "string") return null;
  const trimmed = body.trim().toUpperCase();
  const match = OPT_OUT_KEYWORDS.find((keyword) => keyword === trimmed);
  return match || null;
}

// Numbers arrive from Twilio in different shapes (e.g. "whatsapp:+9715...",
// bare "9715...", "+9715..."); normalize to E.164 so upserts/lookups always
// key on the same string regardless of the caller's formatting.
function normalizePhone(rawPhone) {
  if (!rawPhone) return null;
  const stripped = String(rawPhone).replace(/^whatsapp:/i, "");
  const phoneNumber = parsePhoneNumberFromString(
    stripped.startsWith("+") ? stripped : `+${stripped}`
  );
  if (!phoneNumber || !phoneNumber.isValid()) return null;
  return phoneNumber.number; // E.164
}

function recordOptOut(rawPhone, keyword) {
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    console.warn(`${Date.now()} - optOutService: could not normalize phone "${rawPhone}", skipping opt-out record`);
    return { status: false };
  }

  try {
    db.prepare(
      `INSERT INTO whatsapp_opt_outs (phone, keyword, opted_out_at)
       VALUES (?, ?, ?)
       ON CONFLICT(phone) DO UPDATE SET keyword = excluded.keyword, opted_out_at = excluded.opted_out_at`
    ).run(phone, keyword, Date.now());
    return { status: true };
  } catch (error) {
    console.error(`${Date.now()} - optOutService: failed to record opt-out for ${phone}:`, error);
    return { status: false, error: error.message || error.toString() };
  }
}

function isOptedOut(rawPhone) {
  const phone = normalizePhone(rawPhone);
  if (!phone) return false;

  const row = db
    .prepare(`SELECT 1 FROM whatsapp_opt_outs WHERE phone = ?`)
    .get(phone);
  return !!row;
}

const OPT_OUT_LIST_SORT_FIELDS = ["id", "phone", "keyword", "opted_out_at"];

// Server-side paginated/sorted/filtered listing for the admin dashboard's
// opt-out list view (spec 003, User Story 4). Sort field is allowlisted here
// since dbService._getAll interpolates it directly into the ORDER BY clause.
function listOptOuts({ pageNumber = 0, limit = 25, sortField, sortOrder, advancedClauses = [] } = {}) {
  const safeSortField = OPT_OUT_LIST_SORT_FIELDS.includes(sortField) ? sortField : "opted_out_at";
  const safeSortOrder = sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const total = dbService._getTotalCount("whatsapp_opt_outs", {}, advancedClauses);
  const data = dbService._getAll("whatsapp_opt_outs", {}, {
    advancedClauses,
    sortField: safeSortField,
    sortOrder: safeSortOrder,
    pageNumber,
    limit,
  });

  return { data, total };
}

module.exports = {
  normalizePhone,
  matchOptOutKeyword,
  recordOptOut,
  isOptedOut,
  listOptOuts,
  OPT_OUT_KEYWORDS,
};
