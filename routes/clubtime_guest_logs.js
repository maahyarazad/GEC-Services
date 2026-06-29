const express = require("express");
const router = express.Router();
const dbService = require("../services/dbService");
const db = dbService.getDB();

// Feature 24 — Past Events Log.
// Server-side paginated / filtered / sorted list of past ClubTime &
// Business Breakfast event guests, read from the `clubtime_guests` table.
const TABLE = "clubtime_guests";

// GET /api/clubtime_guest_logs
router.get("/api/clubtime_guest_logs", (req, res) => {
  try {
    const {
      pageNumber,
      limit,
      sortField,
      sortOrder,
      filters,
      jsonFilters,
      advancedClauses,
    } = dbService._QuerySqlConverter(req.query, TABLE);

    const total = dbService._getTotalCount(TABLE, filters, advancedClauses);

    const data = dbService._getAll(TABLE, filters, {
      advancedClauses,
      jsonFilters,
      // Default to most-recent events first; client can override via sortModel.
      sortField: sortField || "event_date",
      sortOrder: sortOrder || "desc",
      pageNumber,
      limit,
    });

    return res.status(200).json({
      status: true,
      data,
      total,
      page: pageNumber + 1,
      pageSize: limit,
    });
  } catch (error) {
    console.error(
      `${Date.now()} - Failed to fetch clubtime guest logs:`,
      error
    );
    return res
      .status(500)
      .json({ status: false, message: "Failed to fetch clubtime guest logs" });
  }
});


// POST /api/clubtime_guest_logs/check-batch
// Body: { phone_numbers: string[], full_names?: string[] }
// Returns every clubtime_guests record whose normalized mobile matches one of the
// supplied phone numbers, OR whose normalized name matches one of the supplied
// full names. Used by the Guest List "History" column.
router.post("/api/clubtime_guest_logs/check-batch", (req, res) => {
  const { phone_numbers, full_names } = req.body;

  if (!Array.isArray(phone_numbers) || phone_numbers.length === 0) {
    return res
      .status(400)
      .json({ status: false, message: "phone_numbers array is required" });
  }

  try {
    // Normalize phones (strip +, -, spaces), de-dupe, and drop blanks.
    const normalizedPhones = [
      ...new Set(
        phone_numbers
          .map((p) => String(p ?? "").replace(/[+\-\s]/g, ""))
          .filter(Boolean)
      ),
    ];

    // Normalize names (trim, collapse inner whitespace, lowercase), de-dupe, drop blanks.
    const normalizedNames = (Array.isArray(full_names) ? full_names : [])
      .map((n) => String(n ?? "").trim().replace(/\s+/g, " ").toLowerCase())
      .filter(Boolean);
    const uniqueNames = [...new Set(normalizedNames)];

    if (normalizedPhones.length === 0 && uniqueNames.length === 0) {
      return res.json({ status: true, data: [] });
    }

    const clauses = [];
    const params = [];

    if (normalizedPhones.length) {
      const ph = normalizedPhones.map(() => "?").join(", ");
      clauses.push(
        `REPLACE(REPLACE(REPLACE(mobile, '+', ''), '-', ''), ' ', '') IN (${ph})`
      );
      params.push(...normalizedPhones);
    }

    if (uniqueNames.length) {
      const nh = uniqueNames.map(() => "?").join(", ");
      clauses.push(`LOWER(TRIM(name)) IN (${nh})`);
      params.push(...uniqueNames);
    }

    const query = `SELECT * FROM ${TABLE} WHERE ${clauses.join(" OR ")}`;
    const data = db.prepare(query).all(...params);

    return res.json({ status: true, data });
  } catch (err) {
    console.error(
      `${Date.now()} - clubtime guest logs batch check error:`,
      err
    );
    return res
      .status(500)
      .json({ status: false, message: "Failed to check clubtime guest logs" });
  }
});




module.exports = router;
