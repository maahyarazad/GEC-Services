const express = require("express");
const router = express.Router();
const dbService = require("../services/dbService");
const authorization_middleware = require("../middleware/auth");
const db = dbService.getDB();
const { corruptedContactBookData } = require("../services/whatsAppSender");


// Lookup contact by phone (normalized — strips +, -, spaces so WaId matches stored phones)
router.get("/api/contacts/lookup", (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ status: false, message: "phone is required" });
  const normalized = phone.replace(/[+\-\s]/g, '');
  const contact = db.prepare(
    "SELECT id FROM contact_book WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), '-', ''), ' ', '') = ?"
  ).get(normalized);
  return res.json({ status: true, data: contact ?? null });
});

// GET a single contact record by id (used by the Event Registration page)
// NOTE: constrain :id to digits so it doesn't shadow sibling word routes like
// /api/contacts/add-to-guest-list or /api/contacts/clear-contact-book.
router.get("/api/contacts/:id(\\d+)", (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ status: false, message: "ID is required" });
    }

    const contact = db.prepare("SELECT * FROM contact_book WHERE id = ?").get(id);

    if (!contact) {
      return res
        .status(404)
        .json({ status: false, message: "Contact not found" });
    }

    res.status(200).json({
      status: true,
      data: contact,
    });
  } catch (error) {
    console.error("Failed to get contact:", error.message);
    res
      .status(500)
      .json({ status: false, message: "Failed to get contact" });
  }
});

// GET latest note for a contact
router.get("/api/contacts/:id/notes", (req, res) => {
  const note = db.prepare(
    "SELECT * FROM contact_book_notes WHERE contact_book_id = ? ORDER BY id DESC LIMIT 1"
  ).get(req.params.id);
  return res.json({ status: true, data: note ?? null });
});

// Upsert note for a contact
router.post("/api/contacts/:id/notes", (req, res) => {
  const { note_body } = req.body;
  const existing = db.prepare(
    "SELECT id FROM contact_book_notes WHERE contact_book_id = ? LIMIT 1"
  ).get(req.params.id);
  if (existing) {
    db.prepare("UPDATE contact_book_notes SET note_body = ? WHERE id = ?").run(note_body, existing.id);
    return res.json({ status: true, id: existing.id });
  }
  const result = db.prepare(
    "INSERT INTO contact_book_notes (contact_book_id, note_body) VALUES (?, ?)"
  ).run(req.params.id, note_body);
  return res.json({ status: true, id: result.lastInsertRowid });
});

// Delete a note by its own id
router.delete("/api/contacts/notes/:noteId", (req, res) => {
  db.prepare("DELETE FROM contact_book_notes WHERE id = ?").run(req.params.noteId);
  return res.json({ status: true });
});

// Batch fetch notes by contact IDs → [{ contact_book_id, note_body }]
router.post("/api/contacts/notes/by-ids", (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.json({ status: true, data: [] });
  const placeholders = ids.map(() => '?').join(', ');
  const rows = db.prepare(
    `SELECT contact_book_id, note_body FROM contact_book_notes WHERE contact_book_id IN (${placeholders}) ORDER BY id DESC`
  ).all(ids);
  const seen = new Set();
  const data = rows.filter(r => { if (seen.has(r.contact_book_id)) return false; seen.add(r.contact_book_id); return true; });
  return res.json({ status: true, data });
});

// Batch fetch notes by phone → [{ phone, note_body }]
// Normalizes both input and stored phones so WaId values (no + or spaces) match contact_book entries.
router.post("/api/contacts/notes/by-phones", (req, res) => {
  const { phones } = req.body;
  if (!Array.isArray(phones) || !phones.length) return res.json({ status: true, data: [] });
  const normalize = (p) => p.replace(/[+\-\s]/g, '');
  const normalizedPhones = phones.map(normalize);
  const placeholders = normalizedPhones.map(() => '?').join(', ');
  const rows = db.prepare(`
    SELECT REPLACE(REPLACE(REPLACE(cb.phone, '+', ''), '-', ''), ' ', '') AS normalized_phone, cbn.note_body
    FROM contact_book cb
    JOIN contact_book_notes cbn ON cbn.contact_book_id = cb.id
    WHERE REPLACE(REPLACE(REPLACE(cb.phone, '+', ''), '-', ''), ' ', '') IN (${placeholders})
    ORDER BY cbn.id DESC
  `).all(normalizedPhones);
  // Map normalized phone back to the original input phone the client sent
  const normalizedToOriginal = new Map(phones.map(p => [normalize(p), p]));
  const seen = new Set();
  const data = rows
    .filter(r => { if (seen.has(r.normalized_phone)) return false; seen.add(r.normalized_phone); return true; })
    .map(r => ({ phone: normalizedToOriginal.get(r.normalized_phone) ?? r.normalized_phone, note_body: r.note_body }));
  return res.json({ status: true, data });
});

router.post("/api/contacts/create", (req, res) => {
  try {
    const contactData = req.body;

    // Check if phone already exists (returns array)
    const duplicates = dbService.findByColumn(
      "contact_book",
      "phone",
      contactData.phone
    );

    if (duplicates.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "Contact already exists",
      });
    }

    const result = dbService.create("contact_book", contactData);

    res.status(200).json({
      status: true,
      message: "Contact created successfully",
      id: result.id,
    });
  } catch (error) {
    console.error(`${Date.now()} - Failed to create contact:`, error.message);
    res
      .status(500)
      .json({ status: false, message: "Failed to create contact" });
  }
});

router.delete("/api/contacts", (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ status: false, message: "ID is required" });
    }

    const result = dbService.remove("contact_book", id);

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ status: false, message: "Contact not found" });
    }

    res.status(200).json({
      status: true,
      message: "Contact deleted successfully",
    });
  } catch (error) {
    console.error(`${Date.now()} - Failed to delete contact:`, error.message);
    res
      .status(500)
      .json({ status: false, message: "Failed to delete contact" });
  }
});

router.put("/api/contacts/modify", (req, res) => {
  try {
    const contactData = req.body;
    if (!contactData.id) {
      return res.status(400).json({ status: false, message: "ID is required" });
    }

    // Check for duplicates excluding current contact id
    const duplicates = dbService.findByColumn(
      "contact_book",
      "phone",
      contactData.phone
    );
    const duplicateExists = duplicates.some((d) => d.id !== contactData.id);

    if (duplicateExists) {
      return res.status(409).json({
        status: "error",
        message: "Contact with this phone number already exists",
      });
    }

    const result = dbService.update(
      "contact_book",
      contactData.id,
      contactData
    );

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ status: false, message: "Contact not found" });
    }

    res.status(200).json({
      status: true,
      message: "Contact updated successfully",
    });
  } catch (error) {
    console.error(`${Date.now()} - Failed to update contact:`, error.message);
    res
      .status(500)
      .json({ status: false, message: "Failed to update contact" });
  }
});

router.get("/api/contacts", (req, res) => {
  try {
    const { blacklist, corrupted, guest_list } = req.query;

    // Handle corrupted contacts - delegate to existing function
    if (corrupted === "1") {
      const result = corruptedContactBookData();
      return res.status(200).json({ status: true, data: result });
    }
    // Type ordering shared across queries
    const TYPE_ORDER_SQL = `
  CASE type
    WHEN 'gec_staff'       THEN 1
    WHEN 'club_partner'    THEN 2
    WHEN 'club_member'     THEN 3
    WHEN 'difa'            THEN 4
    WHEN 'expert'          THEN 5
    WHEN 'expert_guest'    THEN 6
    WHEN 'only_guest'      THEN 7
    WHEN 'medical_society' THEN 8
    ELSE                        9
  END
`;

    // Handle guest list
    if (guest_list === "1") {
      const { event_id } = req.query;

      if (!event_id) {
        return res
          .status(400)
          .json({ status: false, error: "event_id is required" });
      }

        const query = `
        SELECT cb.*, egl.complete_attendance
        FROM contact_book cb
        INNER JOIN (
            SELECT *, ROW_NUMBER() OVER (PARTITION BY contact_book_id ORDER BY id) AS rn
            FROM event_guest_list
            WHERE event_id = ?
        ) egl ON egl.contact_book_id = cb.id
        WHERE egl.rn = 1
        ORDER BY ${TYPE_ORDER_SQL}
        `;

      const result = db.prepare(query).all(event_id);
      return res.status(200).json({ status: true, data: result });
    }

    // Handle default + blacklist: server-side pagination, sorting, filtering
    const blacklistValue = blacklist === "1" || blacklist === "true" ? 1 : 0;

    // Strip mode flags so _QuerySqlConverter doesn't pick them up as legacy filters
    const { blacklist: _bl, corrupted: _cor, guest_list: _gl, ...paginatedQuery } = req.query;

    const { pageNumber, limit, sortField, sortOrder, filters, jsonFilters, advancedClauses } =
      dbService._QuerySqlConverter(paginatedQuery, "contact_book");

    const baseFilters = { ...filters, blacklist: blacklistValue };
    const baseAdvancedClauses = [
      { clause: "phone IS NOT NULL", value: null },
      ...advancedClauses,
    ];

    const total = dbService._getTotalCount("contact_book", baseFilters, baseAdvancedClauses);

    const data = dbService._getAll("contact_book", baseFilters, {
      advancedClauses: baseAdvancedClauses,
      jsonFilters,
      sortField: sortField || "id",
      sortOrder: sortOrder || "asc",
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
    console.error(`${Date.now()} - Failed to fetch contacts:`, error);
    res
      .status(500)
      .json({ status: false, message: "Failed to fetch contacts" });
  }
});

router.get("/api/contacts/clear-contact-book", async (req, res) => {
  try {
    const query = `
      UPDATE contact_book SET contentSid = NULL
    `;

    const stmt = db.prepare(query);
    const result = stmt.run();

    res.status(200).json({
      status: true,
      message: "Contact book cleared successfully",
      changes: result.changes,
    });
  } catch (error) {
    console.error(`${Date.now()} - Failed to clear contact book:`, error);
    res.status(500).json({
      status: false,
      message: "Failed to clear contact book",
    });
  }
});

router.get("/api/contacts/add-to-guest-list", async (req, res) => {
  try {
    const { contactId, eventId } = req.query;

    const duplicateQuery = `SELECT EXISTS (
    SELECT 1
    FROM event_guest_list
    WHERE contact_book_id = ?
      AND event_id = ?
) AS exists_flag;
      `;
    const stmt = db.prepare(duplicateQuery);
    const duplicateCheck = await stmt.get(contactId, eventId);

    if (duplicateCheck.exists_flag === 1) {
      return res.status(404).json({
        status: false,
      });
    }

    const result = dbService.create("event_guest_list", {
      contact_book_id: Number(contactId),
      event_id: Number(eventId),
    });

    res.status(200).json({
      status: true,
      data: result,
    });
  } catch (error) {
    console.error(`${Date.now()} - Failed to fetch contacts:`, error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch contacts",
    });
  }
});

router.patch("/api/contacts/complete-attendance", async (req, res) => {
  try {
    const { contactId, eventId } = req.query;

    if (!contactId || !eventId) {
      return res.status(400).json({
        status: false,
        message: "contactId and eventId are required",
      });
    }

    const completeAttendanceQuery = `
        UPDATE event_guest_list 
        SET complete_attendance = 1
        WHERE contact_book_id = ?
        AND event_id = ?
    `;

    const stmt = db.prepare(completeAttendanceQuery);
    const result = stmt.run(contactId, eventId);

    if (result.changes === 0) {
      return res.status(404).json({
        status: false,
        message: "No matching guest found",
      });
    }

    res.status(200).json({
      status: true,
      message: "Attendance marked complete",
    });
  } catch (error) {
    console.error(`${Date.now()} - Failed to update attendance:`, error);
    res.status(500).json({
      status: false,
      message: "Failed to update attendance",
    });
  }
});

router.delete("/api/contacts/remove-guest", (req, res) => {
  try {
    const { contactId, eventId } = req.query;

    if (!contactId || !eventId) {
      return res.status(400).json({
        status: false,
        message: "contactId and eventId are required",
      });
    }

    const completeAttendanceQuery = `
        DELETE FROM event_guest_list 
        WHERE contact_book_id = ? AND event_id = ?
        
    `;

    const stmt = db.prepare(completeAttendanceQuery);
    const result = stmt.run(contactId, eventId);

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ status: false, message: "Guest not found" });
    }

    res.status(200).json({
      status: true,
      message: "Guest deleted successfully",
    });
  } catch (error) {
    console.error(`${Date.now()} - Failed to delete guest:`, error.message);
    res.status(500).json({ status: false, message: "Failed to remove guest" });
  }
});

router.get("/api/contacts/report/missing-content-sid", (_req, res) => {
  try {
    const query = `
      SELECT cb.type, COUNT(*) AS count
      FROM contact_book AS cb
      WHERE cb.contentSid IS NULL
      GROUP BY cb.type
    `;
    const result = db.prepare(query).all();
    res.status(200).json({ status: true, data: result });
  } catch (error) {
    console.error(`${Date.now()} - Failed to fetch missing content SID report:`, error);
    res.status(500).json({ status: false, message: "Failed to fetch report" });
  }
});


// GET a single contact record by id (used by the Event Registration page)
// NOTE: constrain :id to digits so it doesn't shadow sibling word routes like
// /api/contacts/add-to-guest-list or /api/contacts/clear-contact-book.
router.get("/contacts/:id(\\d+)", authorization_middleware.authorize_operator,(req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ status: false, message: "ID is required" });
    }

    const contact = db.prepare("SELECT * FROM contact_book WHERE id = ?").get(id);

    if (!contact) {
      return res
        .status(404)
        .json({ status: false, message: "Contact not found" });
    }

    res.status(200).json({
      status: true,
      data: contact,
    });
  } catch (error) {
    console.error("Failed to get contact:", error.message);
    res
      .status(500)
      .json({ status: false, message: "Failed to get contact" });
  }
});

module.exports = router;
