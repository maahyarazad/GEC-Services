const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const dbService = require("../services/dbService");
require("dotenv").config();
const multer = require("multer");
const authorization_middleware = require("../middleware/auth");
const { exportTableAsCSV } = require("../services/csvParser");
const { generateMemberPass } = require("../services/applePassService");
const { generateMemberGooglePass } = require("../services/googlePassService");
const { membership_pass_email, sendBatchEmails } = require("../services/emailService");
const uniqid = require("uniqid");
const path = require("path");
const db = dbService.getDB();
const { getPool } = require('../services/mysqlService');
const { normalizePhone } = require("../helpers/essentials");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
}); // 5MB max

const fs = require("fs").promises;
// keep only DB table columns

function titleToSlug(title) {
  return title
    .toLowerCase() // convert to lowercase
    .replace(/\s+/g, "-") // replace spaces (or multiple spaces) with dashes
    .replace(/[^\w-]+/g, ""); // remove any non-alphanumeric characters except dash
}

// ── Member card CSV export ─────────────────────────────────────────────────
// Member passes are stored under the "CORPORATE CARD" title slug (see /member-pass).
const MEMBER_CARD_PASS_SLUG = titleToSlug("CORPORATE CARD");

const applePassUrl = (row) =>
  row.serial_number
    ? `${process.env.CLIENT_ORIGIN}/apple_pass/${MEMBER_CARD_PASS_SLUG}/${row.serial_number}.pkpass`
    : "";

// Leading = + - @ (or tab/CR) would run as a formula in Excel / Sheets (CSV injection).
const neutralize = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(value)) return `'${value}`;
  return value;
};

// Long digit strings (phones, card numbers) would otherwise show as 9.71E+11 in Excel.
const textSafeNumber = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  return /^\+?\d{10,}$/.test(str) ? `="${str}"` : neutralize(value);
};

const toYesNo = (value) => {
  if (value === null || value === undefined || value === "") return "";
  return [1, true, "1", "true"].includes(value) ? "Yes" : "No";
};

const MEMBER_CARD_TYPE_LABELS = { 7: "Corporate (red)", 5: "Blue (non-paid)", 1: "Blue (paid)" };
const typeLabel = (value) => {
  if (value === null || value === undefined || value === "") return "";
  return MEMBER_CARD_TYPE_LABELS[value] || String(value);
};

const pad2 = (n) => String(n).padStart(2, "0");

// Dates are stored in mixed formats: SQLite "YYYY-MM-DD HH:MM:SS", ISO strings and Date.toString().
const formatDate = (value, withTime = true) => {
  if (value === null || value === undefined || value === "") return "";
  const str = String(value);

  // SQLite datetime text has no timezone — keep it as written.
  const sqlite = str.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?(?::\d{2}(?:\.\d+)?)?$/);
  if (sqlite) return withTime && sqlite[2] ? `${sqlite[1]} ${sqlite[2]}` : sqlite[1];

  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return str;

  const day = `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
  return withTime ? `${day} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}` : day;
};

// Column order and labels follow specs/015-member-card-csv-export/data-model.md
const MEMBER_CARD_EXPORT_FIELDS = [
  { label: "ID", value: (row) => row.id },
  { label: "Active", value: (row) => toYesNo(row.active) },
  { label: "Type", value: (row) => typeLabel(row.type) },
  { label: "Card Number", value: (row) => textSafeNumber(row.card_number) },
  { label: "Partner", value: (row) => neutralize(row.partner) },
  { label: "Title", value: (row) => neutralize(row.title) },
  { label: "First Name", value: (row) => neutralize(row.firstname) },
  { label: "Last Name", value: (row) => neutralize(row.lastname) },
  { label: "Gender", value: (row) => neutralize(row.gender) },
  { label: "Birthday", value: (row) => formatDate(row.birthday, false) },
  { label: "Mobile Number", value: (row) => textSafeNumber(row.mobile_number) },
  { label: "Email", value: (row) => neutralize(row.email) },
  { label: "Card Expiry Date", value: (row) => formatDate(row.card_expiry_date) },
  { label: "Member ID", value: (row) => textSafeNumber(row.memberId) },
  { label: "Username", value: (row) => neutralize(row.username) },
  { label: "Paid", value: (row) => toYesNo(row.paid) },
  { label: "Last Login", value: (row) => formatDate(row.last_login) },
  { label: "Serial Number", value: (row) => neutralize(row.serial_number) },
  { label: "Google Pass", value: (row) => neutralize(row.google_pass_token) },
  { label: "Apple Pass", value: (row) => applePassUrl(row) },
  { label: "Remarks", value: (row) => neutralize(row.remarks) },
  { label: "Created At", value: (row) => formatDate(row.metadata_createdAt) },
  { label: "Modified At", value: (row) => formatDate(row.metadata_modifiedAt) },
];

router.post("/member-card", upload.none(), async (req, res) => {
  try {
    const { username } = req.body;

    const data = dbService.findExact(
      "member_card",
      "email",
      username.trim().toLowerCase()
    );

    if (!data || data.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Member not found",
      });
    }

    return res.json({
      status: true,
      data: data[0],
      message: "Success",
    });
  } catch (error) {
    console.error(`${Date.now()} - Error in /member-card:`, error);
    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
});

router.post(
  "/member-pass",
  authorization_middleware.authorize_member,
  async (req, res) => {
    const db = dbService.getDB(); // get your DB connection object
    try {
      const memberToken = req.cookies["member-usr"];
      if (!memberToken) {
        return res.status(401).json({
          status: false,
          message: "No authentication token found. Please authenticate.",
          user: null,
        });
      }

      const { member } = req.body;

            delete member.nationalNumber;
            delete member.countryCallingCode;
            delete member.__countryCallingCodeSource;
            delete member.country;
            delete member.number;

      const memberId = member?.memberId;
      member.title = "CORPORATE CARD";

      const _member = dbService.findByColumn(
        "member_card",
        "email",
        member.email
      )[0];
      let applePKpassPath;
      let googlePassToken;

      const expirationDate = new Date(_member.card_expiry_date);

      const now = new Date();
      const timestamp = Date.now();

      const sameMonthAndYear =
        expirationDate.getFullYear() === now.getFullYear() &&
        expirationDate.getMonth() === now.getMonth();

      let newSerialNumberRequired = false;
      if (!memberId) {
        member.memberId = timestamp;
      }

      if (!sameMonthAndYear && expirationDate < now) {
        const newExpiry = new Date(now);
        newExpiry.setFullYear(newExpiry.getFullYear() + 1);
        member.card_expiry_date = newExpiry;
        newSerialNumberRequired = true;
      }

      if (newSerialNumberRequired || !_member.serial_number) {
        member.serial_number = `GEC-${uniqid().toUpperCase()}`;

        await generateMemberPass({ ...req.body, ...member });
        googlePassToken = await generateMemberGooglePass({
          ...req.body,
          ...member,
        });
      } else {
        member.serial_number = _member.serial_number;
        googlePassToken = _member.google_pass_token;
      }

      const applePath = `/apple_pass/${titleToSlug(member.title)}`;
      applePKpassPath = `${applePath}/${member.serial_number}.pkpass`;

      const updateData = {
        mobile_number: member.mobile_number,
        metadata_modifiedAt: new Date().toISOString(),
        firstname: member.firstname,
        lastname: member.lastname,
        email: member.email,
        serial_number: member.serial_number,
        google_pass_token: googlePassToken,
        birthday: new Date(member.birthday).toISOString(),
      };

      // Add memberId only when it doesn’t exist yet
      if (!memberId) {
        updateData.memberId = timestamp;
      }

      // Build the condition dynamically
      const whereCondition = memberId ? { memberId } : { email: member.email };

      const transaction = db.transaction(() => {
        dbService.updateWhere("member_card", updateData, whereCondition);
      });

      transaction();

      await membership_pass_email({
        data: { member, applePKpassPath, googlePassToken },
      });

      return res.status(200).json({
        status: true,
        data: {
          applePassPath: applePKpassPath,
          googlePassPath: googlePassToken,
        },
      });
    } catch (error) {
      dbService.create("error_log", {
        error: error.toString(),
        origin_function: "createMemberPass_route",
      });

      console.error(`${Date.now()} - Transaction failed:`, error);
      res.status(500).json({ status: false, message: "Server error" });
    }
  }
);

router.post(
  "/member-auto-login",
  upload.none(),
  authorization_middleware.authorize_member,
  async (req, res) => {
    try {
      // const { email, firstname, lastname, mobile_number } = req.body;
      const memberToken = req.cookies["member-usr"];
      if (!memberToken) {
        return res.status(401).json({
          status: false,
          message: "No authentication token found. Please login.",
          user: null,
        });
      }

      const tokenObject = jwt.verify(memberToken, process.env.JWT_SECRET);

      res.status(200).json({ status: true, member: tokenObject.member });
    } catch (error) {
      res.status(500).json({ status: false, message: "Server error" });
    }
  }
);

router.get("/member-card-login", upload.none(), async (req, res) => {
  const { memberId } = req.query;
  try {
    const memberRecord = dbService.findByConditions("member_card", {
      card_number: memberId,
    });
    return res.json({
      status: true,
      message: "Success",
      memberRecord,
    });
  } catch (error) {
    console.error(`${Date.now()} -`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

router.post("/member-login", upload.none(), async (req, res) => {
  const member = req.body; // get the entire object
  try {
    // Sign the entire member object
    const token = jwt.sign({ member }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.cookie("member-usr", token, {
      httpOnly: true, // cannot be accessed via JS
      secure: true, // HTTPS only
      sameSite: "none", // allow cross-site cookie
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    // Best effort — a failed last_login stamp must not block the login.
    if (member?.id && member?.email) {
      try {
        db.prepare(
          "UPDATE member_card SET last_login = datetime('now') WHERE id = ? AND email = ?"
        ).run(member.id, member.email);
      } catch (error) {
        console.error(`${Date.now()} - Failed to record last_login:`, error);
      }
    }

    return res.json({
      status: true,
      message: "Authentication Success",
    });
  } catch (error) {
    console.error(`${Date.now()} -`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

router.post("/member-logout", (req, res) => {
  try {
    // Clear the member-token cookie
    res.clearCookie("member-usr", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    res.json({
      status: true,
      message: "Member has been logged out successfully.",
    });
  } catch (error) {
    console.error(`${Date.now()} - Error clearing token:`, error);
    res.status(500).json({
      status: false,
      message: "Failed to log out. Please try again.",
    });
  }
});

router.get("/api/gec-grouped-partners", async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query("CALL sp_get_partner_contact_grouped_list()");
    return res.json({ status: true, data: rows[0] ?? [] });
  } catch (error) {
    console.error(`${Date.now()} - Error in /api/gec-grouped-partners:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

// Partner names are compared lower-cased, trimmed and with umlauts folded
// (ü→u, ö→o, ä→a, ß→ss) — foldPartnerSql in queries, foldPartner in JS.
const foldPartnerSql = (expr) => `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
      lower(trim(${expr})),
    'Ü', 'u'), 'ü', 'u'),
    'Ö', 'o'), 'ö', 'o'),
    'Ä', 'a'), 'ä', 'a'),
    'ß', 'ss')`;

const foldPartner = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ä/g, "a")
    .replace(/ß/g, "ss");

// Same text format as SQLite datetime('now'), for remarks written from JS.
const sqliteNow = () => new Date().toISOString().slice(0, 19).replace("T", " ");

router.get("/api/member-card-partner-stats", (req, res) => {
  try {
    const stmt = db.prepare(`
     WITH mc AS (
    SELECT
        REPLACE(REPLACE(REPLACE(REPLACE(
            lower(trim(partner)),
        'ü','u'),'ö','o'),'ä','a'),'ß','ss') AS norm_partner,
        MIN(partner)                         AS partner,
        COUNT(*)                             AS member_count,
        COUNT(*) FILTER (WHERE active = 1)   AS active_account,
        COUNT(*) FILTER (WHERE serial_number IS NOT NULL) AS vp_issued
    FROM member_card WHERE partner != ''
    GROUP BY norm_partner
),
pod AS (
    SELECT
        REPLACE(REPLACE(REPLACE(REPLACE(
            lower(trim(partner)),
        'ü','u'),'ö','o'),'ä','a'),'ß','ss') AS norm_partner,
        COUNT(*)                             AS total_records,
        COUNT(*) FILTER (WHERE lower(trim(language)) = 'en') AS pending_en,
        COUNT(*) FILTER (WHERE lower(trim(language)) = 'de') AS pending_de,
        MIN(metadata_createdAt)              AS oldest_pending
    FROM partner_onboarding_data
    WHERE synchronized != 1
    GROUP BY norm_partner
)
SELECT
    mc.partner,
    mc.member_count,
    COALESCE(pod.total_records, 0) AS available_update,
    COALESCE(pod.pending_en, 0) AS pending_en,
    COALESCE(pod.pending_de, 0) AS pending_de,
    pod.oldest_pending,
    mc.active_account,
    mc.vp_issued
FROM mc
LEFT JOIN pod ON mc.norm_partner = pod.norm_partner
ORDER BY available_update DESC, mc.active_account DESC;
    `);
    const data = stmt.all();
    return res.json({ status: true, data });
  } catch (error) {
    console.error(`${Date.now()} - Error in /api/member-card-partner-stats:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

router.get("/api/partner-onboarding-pending-counts", (req, res) => {
  try {
    const data = db.prepare(`
      SELECT partner,
        COUNT(*) AS pending_count,
        COUNT(*) FILTER (WHERE lower(trim(language)) = 'en') AS pending_en,
        COUNT(*) FILTER (WHERE lower(trim(language)) = 'de') AS pending_de,
        MIN(metadata_createdAt) AS oldest_pending
      FROM partner_onboarding_data
      WHERE synchronized != 1
      GROUP BY partner
    `).all();
    return res.json({ status: true, data });
  } catch (error) {
    console.error(`${Date.now()} - Error in /api/partner-onboarding-pending-counts:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

// Applies a partner's pending rows of ONE language to member_card. Every staged row is
// closed individually with its outcome (sync_status), so rows of the other language and
// rows that could not be applied are never marked as synchronized.
router.post("/api/member-card-sync", (req, res) => {
  const { partner, language } = req.body;
  if (!partner) return res.status(400).json({ status: false, message: "partner is required" });
  if (!language || !['en', 'de'].includes(language))
    return res.status(400).json({ status: false, message: "language must be 'en' or 'de'" });

  // Cards created by this sync — they get the invitation email once the transaction commits.
  const createdCards = [];

  try {
    const sync = db.transaction(() => {
      // Step 0 — every pending row for this partner and language; rn > 1 marks older rows
      // for the same phone, which are superseded by the newest one.
      const pending = db.prepare(`
WITH unsynced_table AS (
  SELECT pod.*
  FROM partner_onboarding_data pod
  WHERE ${foldPartnerSql("pod.partner")} = ${foldPartnerSql("?")}
    AND lower(trim(pod.language)) = lower(trim(?))
    AND pod.synchronized != 1
)
SELECT *,
  ROW_NUMBER() OVER (
    PARTITION BY mobile_number
    ORDER BY metadata_createdAt DESC, id DESC
  ) AS rn
FROM unsynced_table;
      `).all(partner, language);

      const result = {
        inserted: 0, updated: 0, moved: 0, deactivated: 0, superseded: 0,
        not_found: 0, conflict: 0, already_active: 0,
        moves: [], conflicts: [],
      };

      if (pending.length === 0) return result;

      // ── Prepared statements ───────────────────────────────────────────────

      const closeRow = db.prepare(`
        UPDATE partner_onboarding_data
        SET synchronized = 1, sync_status = ?, synced_at = datetime('now'), sync_note = ?
        WHERE id = ?
      `);

      const cardsByPhone = db.prepare(
        `SELECT * FROM member_card WHERE mobile_number = ? ORDER BY active DESC, id DESC`
      );

      const getCard = db.prepare(`SELECT * FROM member_card WHERE id = ?`);

      // update rows — safe fields only; an empty birthday keeps the card's birthday
      const updateStmt = db.prepare(`
        UPDATE member_card
        SET firstname = ?, lastname = ?, title = ?,
            gender = CASE ? WHEN 'm' THEN 'Herr' WHEN 'f' THEN 'Frau' ELSE gender END,
            birthday = COALESCE(?, birthday), email = ?, active = 1,
            remarks = 'synchronized ' || datetime('now'),
            metadata_modifiedAt = datetime('now')
        WHERE id = ?
      `);

      // delete rows — soft delete
      const deleteStmt = db.prepare(`
        UPDATE member_card
        SET active = 0, remarks = 'synchronized delete ' || datetime('now'),
            metadata_modifiedAt = datetime('now')
        WHERE id = ?
      `);

      // add rows — skip a phone that is an active member of THIS partner and was synced
      // for this partner within the last 3 months (legacy staged phones may carry a "+")
      const checkActiveGuard = db.prepare(`
        SELECT 1 FROM member_card mc
        WHERE mc.mobile_number = ? AND mc.active = 1
          AND ${foldPartnerSql("mc.partner")} = ${foldPartnerSql("?")}
          AND EXISTS (
            SELECT 1 FROM partner_onboarding_data pod2
            WHERE REPLACE(pod2.mobile_number, '+', '') = ?
              AND pod2.sync_status = 'synchronized'
              AND ${foldPartnerSql("pod2.partner")} = ${foldPartnerSql("?")}
              AND pod2.metadata_createdAt >= datetime('now', '-3 months')
          )
        LIMIT 1
      `);

      const getMaxCardNumber = db.prepare(
        `SELECT MAX(card_number) AS max_num FROM member_card WHERE CAST(card_number AS TEXT) LIKE ?`
      );

      const insertMcStmt = db.prepare(`
        INSERT INTO member_card (
          partner, mobile_number, firstname, lastname, title, gender,
          email, birthday, active, type, card_number, card_expiry_date, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, datetime('now', '+1 year'), 'synchronized')
      `);

      // add rows for an existing card — same partner (refresh) or another partner (move).
      // card_number, serial_number, google_pass_token and memberId are kept.
      const updateMcAddStmt = db.prepare(`
        UPDATE member_card
        SET partner = ?, firstname = ?, lastname = ?, title = ?,
            gender    = CASE ? WHEN 'm' THEN 'Herr' WHEN 'f' THEN 'Frau' ELSE gender END,
            email = ?, birthday = COALESCE(?, birthday),
            type      = CASE ? WHEN 'de' THEN 5 ELSE 7 END,
            active = 1,
            card_expiry_date = datetime('now', '+1 year'),
            remarks = ?,
            metadata_modifiedAt = datetime('now')
        WHERE id = ?
      `);

      // ── Apply each row ────────────────────────────────────────────────────

      for (const r of pending) {
        const close = (status, note = null) => closeRow.run(status, note, r.id);

        if (r.rn > 1) {
          close('superseded', 'older pending row for same phone');
          result.superseded++;
          continue;
        }

        const phone = normalizePhone(r.mobile_number);
        if (!phone) {
          close('not_found', 'no valid phone number');
          result.not_found++;
          continue;
        }

        const cards = cardsByPhone.all(phone);
        const same = cards.filter((c) => foldPartner(c.partner) === foldPartner(r.partner));
        const others = cards.filter((c) => foldPartner(c.partner) !== foldPartner(r.partner));
        const birthday = r.birthday || null;

        // update / delete never touch another partner's card
        if (r.action_type === 'update' || r.action_type === 'delete') {
          if (same.length > 0) {
            for (const card of same) {
              if (r.action_type === 'update') {
                result.updated += updateStmt.run(
                  r.firstname, r.lastname, r.title, r.gender, birthday, r.email, card.id
                ).changes;
              } else {
                result.deactivated += deleteStmt.run(card.id).changes;
              }
            }
            close('synchronized');
          } else if (others.length > 0) {
            result.conflict++;
            result.conflicts.push({
              mobile_number: phone,
              action: r.action_type,
              owner_partner: others[0].partner,
            });
            close('conflict', `owned by ${others[0].partner}`);
          } else {
            result.not_found++;
            close('not_found');
          }
          continue;
        }

        // add
        if (checkActiveGuard.get(phone, r.partner, phone, r.partner)) {
          result.already_active++;
          close('already_active');
          continue;
        }

        if (same.length > 0) {
          // Phone already a card of this partner → refresh and reactivate it
          result.updated += updateMcAddStmt.run(
            same[0].partner, r.firstname, r.lastname, r.title, r.gender, r.email, birthday,
            r.language, `synchronized ${sqliteNow()}`, same[0].id
          ).changes;
          close('synchronized');
        } else if (others.length > 0) {
          // Phone belongs to another partner's card → the employee changed jobs; move it
          const from = others[0];
          updateMcAddStmt.run(
            r.partner, r.firstname, r.lastname, r.title, r.gender, r.email, birthday,
            r.language, `moved from ${from.partner} to ${r.partner} ${sqliteNow()}`, from.id
          );
          result.moved++;
          result.moves.push({ mobile_number: phone, from_partner: from.partner });
          close('synchronized', `moved from ${from.partner}`);
        } else {
          // New member — next card number in the language's range, 1-year expiry
          const prefix = r.language === 'de' ? '5' : '7';
          const maxRow = getMaxCardNumber.get(`${prefix}%`);
          const baseNumber = r.language === 'de' ? 5000000 : 7000000;
          const newCardNumber = (maxRow?.max_num ?? baseNumber) + 1;
          const mcGender = r.gender === 'm' ? 'Herr' : r.gender === 'f' ? 'Frau' : null;
          const mcType = r.language === 'de' ? 5 : 7;
          const info = insertMcStmt.run(
            r.partner, phone, r.firstname, r.lastname, r.title,
            mcGender, r.email, birthday, mcType, newCardNumber
          );
          if (info.changes > 0) {
            createdCards.push(getCard.get(info.lastInsertRowid));
            result.inserted++;
          }
          close('synchronized');
        }
      }

      return result;
    });

    const result = sync();

    // Sent after the response; failures are written to error_log per email.
    if (createdCards.length > 0) {
      sendBatchEmails(createdCards).catch((error) =>
        console.error(`${Date.now()} - Invitation batch failed:`, error)
      );
    }

    return res.json({ status: true, ...result, invitations_queued: createdCards.length });
  } catch (error) {
    console.error(`${Date.now()} - Error in /api/member-card-sync:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

router.post("/api/resend-membership-email", async (req, res) => {
  const { partner } = req.body;
  if (!partner)
    return res
      .status(400)
      .json({ status: false, message: "partner is required" });

  try {

    const query = `SELECT * FROM member_card AS mc WHERE mc.partner = ? AND mc.active = 1 AND mc.serial_number IS NULL`

    const corporateCardEmailSet = db.prepare(query).all(partner);

    // Responds before sending: a large batch would otherwise hold the request
    // open past the client timeout. `queued` is what was accepted for sending,
    // not what was delivered.
    res.json({ status: true, queued: corporateCardEmailSet.length });

    if (corporateCardEmailSet.length > 0) {
      await sendBatchEmails(corporateCardEmailSet);
    }


  } catch (error) {
    console.error(
      `${Date.now()} - Error in /api/resend-membership-email:`,
      error
    );

    // The success response is already sent before the batch runs, so a failure
    // inside sendBatchEmails must not try to respond a second time.
    if (!res.headersSent) {
      res.status(500).json({ status: false, message: "Server error" });
    }
  }
});

router.get("/api/member_card", (req, res) => {
  try {
    const table_name = "member_card";
    const { activeFilter, ...queryWithoutActiveFilter } = req.query;
    const { pageNumber, limit, sortField, sortOrder, filters, jsonFilters, advancedClauses } =
      dbService._QuerySqlConverter(queryWithoutActiveFilter, table_name);

    // Default to active records only; pass activeFilter=all to include inactive
    if (activeFilter !== 'all') {
      advancedClauses.push({ clause: 'active = 1', value: null });
    }

    const total = dbService._getTotalCount(table_name, filters, advancedClauses);
    const data  = dbService._getAll(table_name, filters, {
      advancedClauses,
      jsonFilters,
      sortField: sortField || "id",
      sortOrder: sortOrder || "desc",
      pageNumber,
      limit,
    });

    return res.json({ status: true, data, total });
  } catch (error) {
    console.error(`${Date.now()} - Error in /api/member_card:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

router.get("/api/member-card-csv-data", async (req, res) => {
  try {
    const data = db.prepare("SELECT * FROM member_card ORDER BY id DESC").all();
    const delimiter = req.query.delimiter === "semicolon" ? ";" : ",";

    // BOM so Excel opens the file as UTF-8 (umlauts) instead of ANSI
    const csv = await exportTableAsCSV(data, {
      fields: MEMBER_CARD_EXPORT_FIELDS,
      withBOM: true,
      eol: "\r\n",
      delimiter,
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=membership-data-${Date.now()}.csv`
    );
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.send(csv); // Send the actual CSV string
  } catch (error) {
    console.error(`${Date.now()} - Error in fetching data from sql server:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

router.get("/api/member_card_report", async (req, res) => {
  try {
    const table_name = "member_card";
    const now = new Date(); // current date
    const year = now.getFullYear() - 1;
    const this_month = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const nextMonthDate = new Date(year, now.getMonth() + 1, 1);
    const next_month = `${nextMonthDate.getFullYear()}-${String(
      nextMonthDate.getMonth() + 1
    ).padStart(2, "0")}`;

    const expiring_soon_count = dbService.countExactWithConditions(table_name, {
      card_expiry_date: { op: "BETWEEN", value: [this_month, next_month] },
    });

    const expired = dbService.countExactWithConditions(table_name, {
      card_expiry_date: { op: "<", value: this_month },
    });

    const count_total_valid = dbService.countExactWithConditions(table_name, {
      card_expiry_date: { op: ">", value: this_month },
    });

    const blue_paid = dbService.countExactWithConditions(table_name, {
      type: { op: "=", value: 1 },
    });

    const blue_non_paid = dbService.countExactWithConditions(table_name, {
      type: { op: "=", value: 5 },
    });

    const red = dbService.countExactWithConditions(table_name, {
      type: { op: "=", value: 7 },
    });

    return res.json({
      status: true,
      data: {
        expired: expired,
        expiring_soon_count: expiring_soon_count,
        count_total_valid: count_total_valid,
        blue_paid: blue_paid,
        blue_non_paid: blue_non_paid,
        red: red,
      },
    });
  } catch (error) {
    console.error(`${Date.now()} - Error in /member:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

router.post("/members/mobile-check", upload.none(), async (req, res) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== process.env.SERVICES_SECRET) {
    return res.status(401).json({
      status: false,
      message: "Unauthorized",
    });
  }

  const { mobile } = req.body;

  if (!mobile) {
    return res.status(400).json({
      status: false,
      message: "Mobile number is required",
    });
  }

  const sanitizedMobile = mobile.trim().replace(/\D/g, ""); 

  if (!sanitizedMobile) {
    return res.status(400).json({
      status: false,
      message: "Invalid mobile number format",
    });
  }

  try {
    const query = `
      SELECT *
      FROM member_card mc
      WHERE mc.mobile_number = ?
        AND mc.serial_number IS NOT NULL
        AND mc.active = 1
        AND DATE('now') <= DATE(mc.card_expiry_date, 'start of month', '+1 month', '-1 day')
    `; 

    const stmt = db.prepare(query);
    const memberRecords = stmt.all(sanitizedMobile);

    if (memberRecords.length > 0) { 
      return res.status(200).json({
        status: true,
        message: "Member found",
        count: memberRecords.length,
        data: memberRecords,
      });
    } else {
      return res.status(404).json({
        status: false,
        message: "No active member found for this mobile number",
      });
    }
  } catch (error) {
    console.error(`${Date.now()} - Error checking mobile number:`, error.message);
    return res.status(500).json({
      status: false,
      message: "An unexpected server error occurred. Please try again later.",
    });
  }
});
// GET /api/partner-delivery-info?partner=X  (admin, no partner JWT required)
router.get("/api/partner-delivery-info", (req, res) => {
  try {
    const { partner } = req.query;
    if (!partner) return res.status(400).json({ status: false, message: "partner query param is required" });
    const row = db.prepare(`SELECT * FROM partner_delivery_info WHERE LOWER(partner) = LOWER(?)`).get(partner);
    return res.json({ status: true, data: row ?? null });
  } catch (error) {
    console.error(`${Date.now()} - Error in /api/partner-delivery-info:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

// GET /api/partners-with-delivery  — returns lowercase partner names that have delivery data
router.get("/api/partners-with-delivery", (req, res) => {
  try {
    const rows = db.prepare(`SELECT LOWER(partner) AS partner_key FROM partner_delivery_info`).all();
    return res.json({ status: true, data: rows.map((r) => r.partner_key) });
  } catch (error) {
    console.error(`${Date.now()} - Error in /api/partners-with-delivery:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

module.exports = router;
