const express = require('express');
const router = express.Router();
const dbService = require("../services/dbService");

// ── PUT /api/events  – update an existing event by id ──────────────────────
router.put('/api/events', async (req, res) => {
    try {
        const {
            id,
            title,
            description,
            event_date
        } = req.body;

        // Validate required id
        if (!id) {
            return res.status(400).json({ status: false, message: 'Missing required field: id' });
        }

        const now = new Date().toISOString();

        const fields = [];
        const values = [];

        if (title       !== undefined) { fields.push("title = ?");       values.push(title); }
        if (description !== undefined) { fields.push("description = ?"); values.push(description); }
        if (event_date  !== undefined) { fields.push("event_date = ?");  values.push(event_date); }

        if (fields.length === 0) {
            return res.status(400).json({ status: false, message: 'No fields to update' });
        }

        fields.push("metadata_modifiedAt = ?");
        values.push(now);
        values.push(id); // for the WHERE clause

        const sql = `UPDATE events SET ${fields.join(", ")} WHERE id = ?`;
        dbService.run(sql, values);

        const { filters, data } = dbService.QuerySqlConverter({ id }, "events");
        const total = dbService.getTotalCount("events", filters);

        return res.json({ status: true, data, total });

    } catch (error) {
        console.error("Error in PUT /api/events:", error);
        res.status(500).json({ status: false, message: 'Server error' });
    }
});

// ── POST /api/events  – create a new event ─────────────────────────────────
router.post('/api/events', async (req, res) => {
    try {
        const {
            title,
            description,
            event_date
        } = req.body;

        // Validate required fields
        if (!title || !event_date) {
            return res.status(400).json({
                status: false,
                message: 'Missing required fields: title, event_date'
            });
        }

        const now = new Date().toISOString();

        const sql = `
            INSERT INTO events (title, description, metadata_createdAt, metadata_modifiedAt, event_date)
            VALUES (?, ?, ?, ?, ?)
        `;

        const result = dbService.run(sql, [title, description ?? null, now, now, event_date]);
        const newId  = result?.lastInsertRowid ?? result?.lastID;

        const { data } = dbService.QuerySqlConverter({ id: newId }, "events");

        return res.status(201).json({ status: true, data });

    } catch (error) {
        console.error("Error in POST /api/events:", error);
        res.status(500).json({ status: false, message: 'Server error' });
    }
});

// ── GET /api/events  – fetch events with optional filters ──────────────────
router.get('/api/events', async (req, res) => {
    try {
        const { filters, data } = dbService.QuerySqlConverter(req.query, "events");
        const total = dbService.getTotalCount("events", filters);

        return res.json({ status: true, data, total });

    } catch (error) {
        console.error("Error in GET /api/events:", error);
        res.status(500).json({ status: false, message: 'Server error' });
    }
});

module.exports = router;