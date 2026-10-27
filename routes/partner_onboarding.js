const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { parse } = require("csv-parse/sync");
const dbService = require("../services/dbService");
require("dotenv").config();
const authorization_middleware = require("../middleware/auth");
const { normalizePhone, parseBirthday } = require("../helpers/essentials");
const db = dbService.getDB();
// ── Multer: keep file in memory, CSV only ──────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only .csv files are allowed"));
    }
  },
});

// Valid values per CHECK constraints
const VALID_TITLES = ["Mr.", "Ms.", "Mrs.", "Dr.", ""];
const VALID_GENDERS = ["", "m", "f"];
const VALID_LANGUAGES = ["en", "de"];
const VALID_ACTION_TYPES = ["add", "update", "delete"];

const insertContact = db.prepare(`
  INSERT INTO partner_onboarding_data (
      title,
      firstname,
      lastname,
      gender,
      mobile_number,
      email,
      partner,
      birthday,
      language,
      action_type
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// The employee's current pending row (at most one — see ux_pod_pending_partner_phone)
const findPending = db.prepare(`
  SELECT * FROM partner_onboarding_data
  WHERE LOWER(TRIM(partner)) = LOWER(TRIM(?)) AND mobile_number = ? AND synchronized = 0
  LIMIT 1
`);

const supersedePending = db.prepare(`
  UPDATE partner_onboarding_data
  SET synchronized = 1, sync_status = 'superseded', synced_at = datetime('now'),
      sync_note = 'replaced by upload ' || datetime('now')
  WHERE id = ?
`);

const COMPARED_FIELDS = ["title", "firstname", "lastname", "gender", "email", "birthday", "language", "action_type"];

// A re-upload replaces the employee's pending row; an identical row is counted as unchanged.
const insertMany = db.transaction((contacts, partner) => {
  let inserted = 0;
  let replaced = 0;
  let unchanged = 0;
  let invalid = 0;

  for (const row of contacts) {
    // Normalise keys to lowercase
    const r = Object.fromEntries(
      Object.entries(row).map(([k, v]) => [
        k.toLowerCase().trim(),
        String(v ?? "").trim(),
      ])
    );

    // Sanitise CHECK constraint fields — fall back to "" if value is invalid
    const title = VALID_TITLES.includes(r.title) ? r.title : "";
    const gender = VALID_GENDERS.includes(r.gender) ? r.gender : "";
    const language = VALID_LANGUAGES.includes(r.language) ? r.language : "en";
    const action_type = VALID_ACTION_TYPES.includes(r["add/update/delete"]) ? r["add/update/delete"] : "add";

    // The wizard validates the "Normalized 🔒" column; "Mobile Number" is the free-text input
    const mobile_number = normalizePhone(r["normalized 🔒"] || r["mobile number"]);
    if (!mobile_number) {
      invalid++;
      continue;
    }

    const birthday = parseBirthday(r["date of birth"]);

    const contact = {
      title,
      firstname: r["first name"],
      lastname: r["last name"],
      gender,
      email: r["company email"],
      birthday,
      language,
      action_type,
    };

    const existing = findPending.get(partner, mobile_number);
    if (existing && COMPARED_FIELDS.every((f) => (existing[f] ?? "") === (contact[f] ?? ""))) {
      unchanged++;
      continue;
    }
    if (existing) supersedePending.run(existing.id);

    insertContact.run(
      contact.title,
      contact.firstname,
      contact.lastname,
      contact.gender,
      mobile_number,
      contact.email,
      partner,
      contact.birthday,
      contact.language,
      contact.action_type
    );

    if (existing) replaced++;
    else inserted++;
  }

  return { inserted, replaced, unchanged, invalid };
});

// ── Delivery info pre-fill ─────────────────────────────────────────────────
router.get("/partner-delivery-info",authorization_middleware.authorize_partner,(req, res) => {
  try {

    const { partner } = req.query;
    if (!partner) return res.status(400).json({ status: false, message: "partner query param is required" });

    const row = db.prepare(`
      WITH unsynced_table AS (
        SELECT * FROM partner_delivery_info
        WHERE LOWER(partner) = LOWER(?)
      ),
      deduped AS (
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY phone_number
            ORDER BY updated_at DESC
          ) AS rn
        FROM unsynced_table
      )
      SELECT * FROM deduped WHERE rn = 1
    `).get(partner);

    return res.json({ status: true, data: row ?? null });
  } catch (error) {
    console.error(`${Date.now()} - Delivery info fetch error:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

// ── Existing endpoint ──────────────────────────────────────────────────────
router.post("/partner-auto-login",authorization_middleware.authorize_partner ,async (req, res) => {
  try {
    const partnerToken = req.cookies["partner-usr"];
    if (!partnerToken) {
      return res.status(401).json({
        status: false,
        message: "No authentication token found. Please login.",
        user: null,
      });
    }

    const verifyToken = jwt.verify(partnerToken, process.env.JWT_SECRET);

    return res.status(200).json({
      status: true,
      message: "Verification successful",
      data: { ...verifyToken.partner },
    });
  } catch (error) {
    res.status(500).json({ status: false, message: "Server error" });
  }
});

// ── New CSV upload endpoint ────────────────────────────────────────────────
router.post("/upload-csv",authorization_middleware.authorize_partner ,upload.single("file"), (req, res) => {
  try {

    // The partner comes from the signed partner session, never from the form — an "add"
    // can move a card between partners, so the form field must not choose the partner.
    const session = jwt.verify(req.cookies["partner-usr"], process.env.JWT_SECRET);
    const partner = session?.partner?.title;
    const deliveryAddress = req.body.delivery_address || null;
    const contactPerson = req.body.contact_person || null;
    const phoneNumber = req.body.phone_number || null;

    if (!partner) {
      return res
        .status(401)
        .json({ status: false, message: "Partner session has no partner" });
    }

    // 2. Check a file was actually attached
    if (!req.file) {
      return res
        .status(400)
        .json({ status: false, message: "No file uploaded" });
    }

    // 3. Parse CSV bytes → array of row objects
    //    csv-parse reads the first row as column headers automatically
    const rows = parse(req.file.buffer, {
      columns: true, // use header row as keys
      skip_empty_lines: true,
      trim: true, // strip whitespace from values
    });

    if (rows.length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "CSV file is empty" });
    }

    // Employees and delivery info are saved together or not at all
    const counts = db.transaction(() => {
      const result = insertMany(rows, partner);

      db.prepare(`
        INSERT INTO partner_delivery_info (partner, delivery_address, contact_person, phone_number, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(partner) DO UPDATE SET
          delivery_address = excluded.delivery_address,
          contact_person = excluded.contact_person,
          phone_number = excluded.phone_number,
          updated_at = CURRENT_TIMESTAMP
      `).run(partner, deliveryAddress, contactPerson, phoneNumber);

      return result;
    })();

    return res.status(200).json({
      status: true,
      message: "CSV imported successfully",
      total: rows.length,
      inserted: counts.inserted, // new employees staged
      replaced: counts.replaced, // replaced an earlier pending row
      unchanged: counts.unchanged, // identical to the pending row — nothing staged
      skipped: counts.unchanged, // kept for older clients
      invalid: counts.invalid, // no usable phone number
    });
  } catch (error) {
    console.error(`${Date.now()} - CSV upload error:`, error);

    // Multer file-type rejection
    if (error.message === "Only .csv files are allowed") {
      return res.status(400).json({ status: false, message: error.message });
    }

    res.status(500).json({ status: false, message: "Server error" });
  }
});




router.get("/api/partner-onboarding", async (req, res) => {
  try {
    // Extract synchronized flag before passing query to _QuerySqlConverter
    // so it is not treated as a legacy filter field by dbService
    const { synchronized: syncFlag, ...queryWithoutSync } = req.query;

    const {pageNumber,limit,sortField,sortOrder,filters,jsonFilters,advancedClauses} = dbService._QuerySqlConverter(
      queryWithoutSync,
      "partner_onboarding_data AS pod",
      {
        table: "member_card AS mc",
        on: "pod.mobile_number = mc.mobile_number",
      },
      ["pod.*", "mc.id AS member_card_id"]
    );

    // Default: only unsynced records unless synchronized=true
    if (syncFlag !== 'true') {
      advancedClauses.push({ clause: 'pod.synchronized != 1', value: null });
    }

const total = dbService._getTotalCount(
  "partner_onboarding_data AS pod LEFT JOIN member_card AS mc ON pod.mobile_number = mc.mobile_number",
  filters,
  advancedClauses
);

    const data = dbService._getAll(
     "partner_onboarding_data AS pod",
      filters, // legacy equality filters
      {
        columns: ["pod.*", "mc.id AS member_card_id"],
        leftJoin: {
          table: "member_card AS mc",
          on: "pod.mobile_number = mc.mobile_number",
        },
        advancedClauses, // operator-aware filters
        jsonFilters, // JSON path filters
        sortField,
        sortOrder,
        pageNumber,
        limit,
      }
    );

    return res.json({
      success: true,
      data,
      total,
      page: pageNumber + 1,
      pageSize: limit,
    });
  } catch (error) {
    console.error(`${Date.now()} - Error in /registration:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});



// GET /api/partner-delivery-employees?partner=X&...  (admin, German-speaking only)
router.get("/api/partner-delivery-employees", (req, res) => {
  try {
    const { partner: partnerParam, synchronized: syncFlag, ...queryRest } = req.query;
    if (!partnerParam) {
      return res.status(400).json({ status: false, message: "partner query param is required" });
    }

    const { pageNumber, limit, sortField, sortOrder, filters, jsonFilters, advancedClauses } =
      dbService._QuerySqlConverter(
        queryRest,
        "partner_onboarding_data AS pod",
        { table: "member_card AS mc", on: "pod.mobile_number = mc.mobile_number" },
        ["pod.*", "mc.id AS member_card_id"]
      );

    advancedClauses.push({ clause: "pod.partner = ?", value: partnerParam });
    advancedClauses.push({ clause: "pod.language = 'de'", value: null });

    if (syncFlag !== "true") {
      advancedClauses.push({ clause: "pod.synchronized != 1", value: null });
    }

    const total = dbService._getTotalCount(
      "partner_onboarding_data AS pod LEFT JOIN member_card AS mc ON pod.mobile_number = mc.mobile_number",
      filters,
      advancedClauses
    );

    const data = dbService._getAll("partner_onboarding_data AS pod", filters, {
      columns: ["pod.*", "mc.id AS member_card_id"],
      leftJoin: { table: "member_card AS mc", on: "pod.mobile_number = mc.mobile_number" },
      advancedClauses,
      jsonFilters,
      sortField,
      sortOrder,
      pageNumber,
      limit,
    });

    return res.json({ success: true, data, total, page: pageNumber + 1, pageSize: limit });
  } catch (error) {
    console.error(`${Date.now()} - Error in /api/partner-delivery-employees:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

// ── Corporate Member ADD ──────────────────────────────────────────────────────
router.post("/api/partner-onboarding/employee", (req, res) => {
  try {
    const { title, firstname, lastname, gender, mobile_number, email, partner, birthday, type } = req.body;

    if (!firstname || !lastname || !email || !partner) {
      return res.status(400).json({ status: false, message: "firstname, lastname, email and partner are required" });
    }

    const VALID_TITLES = ["Mr.", "Ms.", "Mrs.", "Dr.", ""];
    const VALID_GENDERS = ["Herr", "Frau", ""];

    const result = db.prepare(`
      INSERT INTO member_card (title, firstname, lastname, gender, mobile_number, email, partner, birthday, active, type, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'manually added')
    `).run(
      VALID_TITLES.includes(title) ? title : "",
      firstname,
      lastname,
      VALID_GENDERS.includes(gender) ? (gender || null) : null,
      mobile_number || null,
      email,
      partner,
      birthday || null,
      type === 5 ? 5 : 7
    );

    return res.status(201).json({ status: true, message: "Member added", id: result.lastInsertRowid });
  } catch (error) {
    console.error(`${Date.now()} - Add member error:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

// ── Corporate Member UPDATE ───────────────────────────────────────────────────
router.put("/api/partner-onboarding/employee/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { title, firstname, lastname, gender, mobile_number, email, partner, birthday, type } = req.body;

    if (!firstname || !lastname || !email || !partner) {
      return res.status(400).json({ status: false, message: "firstname, lastname, email and partner are required" });
    }

    const VALID_TITLES = ["Mr.", "Ms.", "Mrs.", "Dr.", ""];
    const VALID_GENDERS = ["Herr", "Frau", ""];

    const result = db.prepare(`
      UPDATE member_card
      SET title = ?, firstname = ?, lastname = ?, gender = ?, mobile_number = ?,
          email = ?, partner = ?, birthday = ?, type = ?, metadata_modifiedAt = datetime('now')
      WHERE id = ?
    `).run(
      VALID_TITLES.includes(title) ? title : "",
      firstname,
      lastname,
      VALID_GENDERS.includes(gender) ? (gender || null) : null,
      mobile_number || null,
      email,
      partner,
      birthday || null,
      type === 5 ? 5 : 7,
      id
    );

    if (result.changes === 0) return res.status(404).json({ status: false, message: "Record not found" });

    return res.status(200).json({ status: true, message: "Member updated" });
  } catch (error) {
    console.error(`${Date.now()} - Update member error:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

// ── Corporate Member DELETE (soft) ────────────────────────────────────────────
router.delete("/api/partner-onboarding/employee/:id", (req, res) => {
  try {
    const { id } = req.params;

    const result = db.prepare(`
      UPDATE member_card SET active = 0, remarks = 'deleted ' || datetime('now'), metadata_modifiedAt = datetime('now')
      WHERE id = ?
    `).run(id);

    if (result.changes === 0) return res.status(404).json({ status: false, message: "Record not found" });

    return res.status(200).json({ status: true, message: "Member deactivated" });
  } catch (error) {
    console.error(`${Date.now()} - Delete member error:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

module.exports = router;
