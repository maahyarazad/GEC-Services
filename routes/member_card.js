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
const { membership_pass_email } = require("../services/emailService");
const uniqid = require("uniqid");
const path = require("path");
const db = dbService.getDB();

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
    console.error("Error in /member-card:", error);
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

      console.error("Transaction failed:", error);
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
    console.error(error);
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

    return res.json({
      status: true,
      message: "Authentication Success",
    });
  } catch (error) {
    console.error(error);
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
    console.error("Error clearing token:", error);
    res.status(500).json({
      status: false,
      message: "Failed to log out. Please try again.",
    });
  }
});

router.get("/api/gec-grouped-partners", async (req, res) => {
  try {
   const baseUrl = process.env.ENVIRONMENT === "PRODUCTION" ? `${process.env.GEC__ORIGIN}/api/`: `${process.env.GEC__ORIGIN}`

    const fetchRes = await fetch(`${baseUrl}partners/get-grouped-partner-list`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        services_secret: process.env.SERVICES_SECRET,
      },
    });

    if (!fetchRes.ok) {
      return res.status(502).json({ status: false, message: "GEC fetch failed" });
    }
    
    const partnerData = await fetchRes.json();


    return res.json({ status: true, data: partnerData?.data.filter(x=> x.status === '1') ?? [] });
  } catch (error) {
    console.error("Error in /api/gec-grouped-partners:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

router.get("/api/member-card-partner-stats", (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT
          mc.partner,
          mc.member_count,
          COALESCE(pod.total_records, 0) AS available_update
      FROM (
          SELECT partner, COUNT(*) AS member_count
          FROM member_card
          GROUP BY partner
      ) AS mc
      LEFT JOIN (
          SELECT partner, COUNT(*) AS total_records
          FROM partner_onboarding_data
          WHERE metadata_createdAt >= datetime('now', '-1 month')
            AND synchronized != 1
          GROUP BY partner
      ) AS pod
        ON LOWER(mc.partner) = LOWER(pod.partner)
      ORDER BY available_update DESC, mc.member_count DESC
    `);
    const data = stmt.all();
    return res.json({ status: true, data });
  } catch (error) {
    console.error("Error in /api/member-card-partner-stats:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

router.get("/api/partner-onboarding-pending-counts", (req, res) => {
  try {
    const data = db.prepare(`
      SELECT partner, COUNT(*) AS pending_count
      FROM partner_onboarding_data
      WHERE metadata_createdAt >= datetime('now', '-1 month')
        AND synchronized != 1
      GROUP BY partner
    `).all();
    return res.json({ status: true, data });
  } catch (error) {
    console.error("Error in /api/partner-onboarding-pending-counts:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

router.post("/api/member-card-sync", (req, res) => {
  const { partner } = req.body;
  if (!partner) return res.status(400).json({ status: false, message: "partner is required" });

  try {
    const sync = db.transaction(() => {
      // Step 0 — load the pending batch for this partner
      const batch = db.prepare(`
      WITH unsynced_table AS (
  SELECT * FROM partner_onboarding_data
  WHERE LOWER(partner) = LOWER(?)
    AND metadata_createdAt >= datetime('now', '-1 month')
    AND synchronized != 1
),
deduped AS (
  SELECT *,
    ROW_NUMBER() OVER (
      PARTITION BY mobile_number
      ORDER BY metadata_createdAt DESC
    ) AS rn
  FROM unsynced_table
)
SELECT *
FROM deduped
WHERE rn = 1;
      `).all(partner);

      if (batch.length === 0) return { updated: 0, inserted: 0, deactivated: 0 };

      const addBatch    = batch.filter(r => r.action_type === 'add');
      const updateBatch = batch.filter(r => r.action_type === 'update');
      const deleteBatch = batch.filter(r => r.action_type === 'delete');

      let updated = 0;
      let deactivated = 0;

      // STEP 1:  Handle 'update' action: apply field changes to existing member_card rows
      const updateStmt = db.prepare(`
        UPDATE member_card
        SET firstname = ?, lastname = ?, title = ?,
            gender    = CASE ? WHEN 'm' THEN 'Herr' WHEN 'f' THEN 'Frau' ELSE NULL END,
            email = ?, birthday = ?,
            type      = CASE ? WHEN 'de' THEN 5 ELSE 7 END,
            active = 1,
            remarks = 'synchronized ' || datetime('now'),
            metadata_modifiedAt = datetime('now')
        WHERE LOWER(partner) = LOWER(?) AND mobile_number = ?
      `);
      for (const r of updateBatch) {
        updated += updateStmt.run(r.firstname, r.lastname, r.title, r.gender, r.email, r.birthday, r.language, r.partner, r.mobile_number).changes;
      }

      // STEP 2: Handle 'delete' action: soft-delete matching member_card rows
      const deleteStmt = db.prepare(`
        UPDATE member_card SET active = 0, remarks = 'synchronized delete ' || datetime('now')
        WHERE LOWER(partner) = LOWER(?) AND mobile_number = ?
      `);
      for (const r of deleteBatch) {
        deactivated += deleteStmt.run(r.partner, r.mobile_number).changes;
      }

      // STEP 3: Handle 'add' action: batch INSERT / UPDATE / DEACTIVATE (original logic)
      let insertResult = { changes: 0 };
      let deactivateResult = { changes: 0 };
      let updateResult = { changes: 0 };

      if (addBatch.length > 0) {
       
        // INSERT new members whose mobile_number is not yet in member_card
        insertResult = db.prepare(`
          INSERT INTO member_card (partner, mobile_number, firstname, lastname, title, gender, email, birthday, active, type, remarks)
          SELECT pod.partner, pod.mobile_number, pod.firstname, pod.lastname,
                 pod.title,
                 CASE pod.gender WHEN 'm' THEN 'Herr' WHEN 'f' THEN 'Frau' ELSE NULL END,
                 pod.email, pod.birthday,
                 1,
                 CASE pod.language WHEN 'de' THEN 5 ELSE 7 END,
                 'synchronized ' || datetime('now')
          FROM partner_onboarding_data AS pod
          WHERE LOWER(pod.partner) = LOWER(?)
            AND pod.metadata_createdAt >= datetime('now', '-1 month')
            AND pod.synchronized != 1
            AND (pod.action_type IS NULL OR pod.action_type = 'add')
            AND NOT EXISTS (
                SELECT 1 FROM member_card AS mc
                WHERE LOWER(mc.partner) = LOWER(pod.partner)
                  AND mc.mobile_number = pod.mobile_number
            )
        `).run(partner);

       
      }

      // Step 4 — Mark all batch records as synchronized
      db.prepare(`
        UPDATE partner_onboarding_data
        SET synchronized = 1
        WHERE LOWER(partner) = LOWER(?)
          AND metadata_createdAt >= datetime('now', '-1 month')
          AND synchronized != 1
      `).run(partner);

      return {
        updated:     updated + updateResult.changes,
        inserted:    insertResult.changes,
        deactivated: deactivated + deactivateResult.changes,
      };
    });

    const result = sync();
    return res.json({ status: true, ...result });
  } catch (error) {
    console.error("Error in /api/member-card-sync:", error);
    res.status(500).json({ status: false, message: "Server error" });
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
    console.error("Error in /api/member_card:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

router.get("/api/member-card-csv-data", async (req, res) => {
  try {
    const data = dbService.findAll("member_card");

    const csv = await exportTableAsCSV(data); // Await CSV generation

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=membership-data-${Date.now()}.csv`
    );
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.send(csv); // Send the actual CSV string
  } catch (error) {
    console.error("Error in fetching data from sql server:", error);
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
    console.error("Error in /member:", error);
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
    console.error("Error checking mobile number:", error.message);
    return res.status(500).json({
      status: false,
      message: "An unexpected server error occurred. Please try again later.",
    });
  }
});
module.exports = router;
