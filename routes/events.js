const express = require("express");
const router = express.Router();
const dbService = require("../services/dbService");
const {check_generateQR_WhatsApp} = require("../services/qrGenerator");
const fs = require("fs");
const path = require("path");


const db = dbService.getDB();
// ── PUT /api/events  – update an existing event by id ──────────────────────
router.put("/api/events", (req, res) => {
  try {
    const { id, title, description, event_date } = req.body;

    // Validate required id
    if (!id) {
      return res
        .status(400)
        .json({ status: false, message: "Missing required field: id" });
    }

    const data = {
      title,
      description,
      event_date,
      metadata_modifiedAt: new Date().toISOString(),
    };

    const result = dbService.update("events", id, data);

    return res.json({ status: true, result });
  } catch (error) {
    console.error(`${Date.now()} - Error in PUT /api/events:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

// ── POST /api/events  – create a new event ─────────────────────────────────
router.post("/api/events", async (req, res) => {
  try {
    const { title, description, event_date } = req.body;

    // Validate required fields
    if (!title || !event_date) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields: title, event_date",
      });
    }

    const result = dbService.create("events", {
      title: title,
      description: description,
      event_date: event_date,
    });
    return res.status(201).json({ status: true, result });
  } catch (error) {
    console.error(`${Date.now()} - Error in POST /api/events:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

// ── GET /api/events  – fetch events with optional filters ──────────────────
router.get("/api/events", async (req, res) => {
  try {
    const { filters, data } = dbService.QuerySqlConverter(req.query, "events");
    const total = dbService.getTotalCount("events", filters);

    return res.json({ status: true, data, total });
  } catch (error) {
    console.error(`${Date.now()} - Error in GET /api/events:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

// ── GET /api/events/active  – return the single active event ──────────────────
router.get("/api/events/active", (req, res) => {
  try {
    const row = db.prepare(
      "SELECT id, title, event_date FROM events WHERE active_event = 1 LIMIT 1"
    ).get();
    return res.json({ status: true, event: row ?? null });
  } catch (error) {
    console.error(`${Date.now()} - Error in GET /api/events/active:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

router.get("/api/events/latest", async (req, res) => {
  try {
    const dataQuery = `
      SELECT id, title
      FROM events
      ORDER BY id DESC;
    `;
    const dataStmt = db.prepare(dataQuery);
    const rows = dataStmt.all();

    return res.json({ status: true, rows });
  } catch (error) {
    console.error(`${Date.now()} - Error in GET /api/events:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

// ── PATCH /api/events/:id/auto-response  – update auto-response fields ────────
router.patch("/api/events/:id/auto-response", (req, res) => {
  try {
    const { id } = req.params;
    const {
      auto_response_general_de,
      auto_response_general_en,
      auto_response_guest_de,
      auto_response_guest_en,
    } = req.body;

    db.prepare(`
      UPDATE events SET
        auto_response_general_de = ?,
        auto_response_general_en = ?,
        auto_response_guest_de   = ?,
        auto_response_guest_en   = ?,
        metadata_modifiedAt      = ?
      WHERE id = ?
    `).run(
      auto_response_general_de ?? null,
      auto_response_general_en ?? null,
      auto_response_guest_de   ?? null,
      auto_response_guest_en   ?? null,
      new Date().toISOString(),
      id
    );

    return res.json({ status: true });
  } catch (error) {
    console.error(`${Date.now()} - Error in PATCH /api/events/:id/auto-response:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

// ── PATCH /api/events/:id/active  – toggle active event (only one at a time) ─
router.patch("/api/events/:id/active", (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (active) {
      const deactivateAll = db.prepare("UPDATE events SET active_event = 0");
      const activate = db.prepare("UPDATE events SET active_event = 1, metadata_modifiedAt = ? WHERE id = ?");
      db.transaction(() => {
        deactivateAll.run();
        activate.run(new Date().toISOString(), id);
      })();
    } else {
      db.prepare("UPDATE events SET active_event = 0, metadata_modifiedAt = ? WHERE id = ?")
        .run(new Date().toISOString(), id);
    }

    return res.json({ status: true });
  } catch (error) {
    console.error(`${Date.now()} - Error in PATCH /api/events/:id/active:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

router.delete("/api/events/:id", (req, res) => {
  try {
    const { id } = req.params;

    const result = dbService.remove("events", id);

    return res.json({ status: true, data: result });
  } catch (error) {
    console.error(`${Date.now()} - Error in DELETE /api/events:`, error);
    return res.status(500).json({ status: false, message: error.message });
  }
});


router.post("/api/events/qr-code/by-ids", (req, res) => {
  try {
    const { ids, eventId, contentSids } = req.body;

    if (!Array.isArray(ids) || !ids.length) return res.json({ status: true, data: [] });

    const evId = eventId?.id ?? eventId;

    // Batched lookup: one query with `contact_book_id IN (?, ?, ...)` instead of
    // a check per id. When specific media templates are selected, a QR counts as
    // "generated" if a record exists for ANY of the selected contentSids.
    const selected = Array.isArray(contentSids) ? contentSids.filter(Boolean) : [];

    if(selected.length === 0) return res.json({ status: true, data: [] }); 
    const idPlaceholders = ids.map(() => "?").join(", ");
    let sql = `
      SELECT DISTINCT contact_book_id
      FROM contact_book_events
      WHERE event_id = ?
        AND contact_book_id IN (${idPlaceholders})
    `;
    const params = [evId, ...ids];

    if (selected.length) {
      const sidPlaceholders = selected.map(() => "?").join(", ");
      sql += ` AND contentSid IN (${sidPlaceholders})`;
      params.push(...selected);
    }

    const rows = db.prepare(sql).all(...params);
    const generated = new Set(rows.map((r) => Number(r.contact_book_id)));

    const data = ids.map((id) => ({ contact_book_id: id, qr: generated.has(Number(id)) }));
    return res.json({ status: true, data });
  } catch (error) {
    console.error(`${Date.now()} - Error in /api/events/qr-code/by-ids:`, error);
    return res.status(500).json({ status: false, message: "Server error" });
  }
});

// ── POST /api/events/qr-code/view  – return a single guest's QR code PNG ──────
// Part 4: the operator clicks the green check to view the already-generated QR.
router.post("/api/events/qr-code/view", (req, res) => {
  try {
    const { contactId, eventId } = req.body;
    const evId = eventId?.id ?? eventId;

    if (!contactId || !evId) {
      return res.status(400).json({ status: false, message: "contactId and eventId are required" });
    }

    const filePath = path.join(__dirname, "..", "qr_files", `${evId}-${contactId}.png`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ status: false, message: "QR code not found" });
    }

    const buffer = fs.readFileSync(filePath);
    res.set({ "Content-Type": "image/png", "Content-Length": buffer.length });
    return res.send(buffer);
  } catch (error) {
    console.error(`${Date.now()} - Error in /api/events/qr-code/view:`, error);
    return res.status(500).json({ status: false, message: "Server error" });
  }
});


router.post("/api/events/qr-code-generated/by-ids", async (req, res) => {
  const { ids } = req.body;
  const { eventId } = req.body;

  if (!Array.isArray(ids) || !ids.length)
    return res.json({ status: true, data: [] });

  const data = await Promise.all(
    ids.map(async (id) => {
      const result = await check_generateQR_WhatsApp(id, eventId?.id);
      return { contact_book_id: id, qr: result };
    })
  );
  return res.json({ status: true, data });
});

module.exports = router;
