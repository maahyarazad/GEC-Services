const express = require("express");
const router = express.Router();
const dbService = require("../services/dbService");
const db = dbService.getDB();

// Feature 24 — Past Events Log.
// Server-side paginated / filtered / sorted list of past ClubTime &
// Business Breakfast event guests, read from the `clubtime_guests` table.
const TABLE = "clubtime_guests";


// Convert a V2 row into the V1 (reference) shape
function v2ToV1(v2, id) {
  const name = [v2.first_name, v2.last_name]
    .filter(Boolean)
    .map((s) => s.trim())
    .join(" ")
    .trim();

  return {
    id,
    event_title: v2.title ?? null,
    event_type: v2.title ? v2.title.split(" ")[0] : null, // guessed from title
    name: name || null,
    member_partner: null,
    remarks: null,
    mobile: null,
    invitee: null,
    note: null,
    event_date: v2.event_date ? v2.event_date.split("T")[0] : null, // YYYY-MM-DD
    created_at: null,
  };
}

// Combine V1 rows (kept as-is) with mapped V2 rows
// Combine V1 rows (kept as-is) with mapped V2 rows
function combineRows(v1Rows = [], v2Rows = []) {
  // maxId is ONLY for minting unique ids on new V2 rows — not for ordering
  const maxId = v1Rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
  const mappedV2 = v2Rows.map((v2, i) => v2ToV1(v2, maxId + i + 1));

  // V1 stays untouched; combine then order by event_date DESC (newest first)
  return [...mappedV2, ...v1Rows];

  combined.sort((a, b) => new Date(b.date) - new Date(a.date));
  return combined;
}


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
// Body: { phone_numbers: string[], full_names?: string[], eventId: number }
// Returns clubtime_guests records (from events strictly BEFORE this event's date)
// whose normalized mobile matches one of the supplied phone numbers, OR whose
// normalized name matches one of the supplied full names.
router.post("/api/clubtime_guest_logs/check-batch", (req, res) => {
  const { phone_numbers, full_names, eventId } = req.body;

  if (!Array.isArray(phone_numbers) || phone_numbers.length === 0) {
    return res
      .status(400)
      .json({ status: false, message: "phone_numbers array is required" });
  }

  if (eventId == null) {
    return res
      .status(400)
      .json({ status: false, message: "eventId is required" });
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
      .map((n) =>
        String(n ?? "")
          .trim()
          .replace(/\s+/g, " ")
          .toLowerCase()
      )
      .filter(Boolean);
    const uniqueNames = [...new Set(normalizedNames)];

    if (normalizedPhones.length === 0 && uniqueNames.length === 0) {
      return res.json({ status: true, data: [] });
    }

  

    const eventDateStmt = db.prepare(
      "SELECT event_date FROM events WHERE id = ?"
    );

    // Wrap both reads in a transaction so they see a consistent snapshot.
    // Returns the matching rows, or null if the event doesn't exist.
    const data = db.transaction(() => {
      const eventRow = eventDateStmt.get(eventId.id);
      if (!eventRow) return null;

      
      const eventDate = eventRow.event_date;
      
      const _ph = phone_numbers?.map(() => "?").join(", ");
      
      const v2_EventDateStmt = db.prepare(`
        SELECT cb.first_name, cb.last_name, e.title, e.event_date FROM contact_book AS cb
        LEFT JOIN event_guest_list AS gsl ON cb.id = gsl.contact_book_id
        LEFT JOIN events AS e ON gsl.event_id = e.id
        WHERE gsl.id IS NOT NULL AND gsl.complete_attendance = 1 AND cb.phone IN (${_ph}) AND e.event_date > ? order by e.event_date DESC;
        `);
        
        const v2Rows = v2_EventDateStmt.all(phone_numbers,eventDate);
        
        const clauses = [];
        const params = [];
        
        if (normalizedPhones.length) {
          const ph = normalizedPhones.map(() => "?").join(", ");
          clauses.push(
              `REPLACE(REPLACE(REPLACE(cg.mobile, '+', ''), '-', ''), ' ', '') IN (${ph})`
          );
          params.push(...normalizedPhones);
      }

      if (uniqueNames.length) {
        const nh = uniqueNames.map(() => "?").join(", ");
        clauses.push(`LOWER(TRIM(cg.name)) IN (${nh})`);
        params.push(...uniqueNames);
      }


      const query =
        `SELECT * FROM clubtime_guests cg ` +
        `WHERE (${clauses.join(" OR ")}) AND date(cg.event_date) < date(?)`;

      params.push(eventDate); 

      
      // Sanity check: placeholder count must equal params length.
      const placeholderCount = (query.match(/\?/g) || []).length;
      if (placeholderCount !== params.length) {
        throw new Error(
          `Param mismatch: ${placeholderCount} placeholders vs ${params.length} params`
        );
      }

      const v1Rows = db.prepare(query).all(...params);

      return combineRows(v1Rows, v2Rows);
    })();

    if (data === null) {
      return res
        .status(404)
        .json({ status: false, message: "Event not found" });
    }

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
