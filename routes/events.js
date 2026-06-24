const express = require("express");
const router = express.Router();
const dbService = require("../services/dbService");
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
      ORDER BY event_date DESC LIMIT 10
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

module.exports = router;
