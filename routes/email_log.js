// Admin API for the do-not-reply email log (feature 008-email-log-dashboard).
//
// Read-only. Entries are written only by services/emailLogService.logEmailSend()
// inside the email transport — there is no HTTP endpoint that creates/edits/
// deletes log rows. Both endpoints require admin auth (cookie `a-usr` JWT).
//
// Contract: specs/008-email-log-dashboard/contracts/email-log-api.md

const express = require("express");
const router = express.Router();
const dbService = require("../services/dbService");
const db = dbService.getDB();
const authorize = require("../middleware/auth");
const emailLogService = require("../services/emailLogService");

// ─── DB migration (idempotent — runs once at startup) ────────────────────────
// Mirrors the DDL documented in create_tables.sql.
(function runMigrations() {
  const steps = [
    `CREATE TABLE IF NOT EXISTS email_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      category    TEXT    NOT NULL,
      recipient   TEXT    NOT NULL,
      subject     TEXT,
      status      TEXT    NOT NULL CHECK (status IN ('sent','failed')),
      error       TEXT,
      created_at  INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_email_log_category  ON email_log (category)`,
    `CREATE INDEX IF NOT EXISTS idx_email_log_created   ON email_log (created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_email_log_recipient ON email_log (recipient)`,
  ];
  for (const sql of steps) {
    try {
      db.exec(sql);
    } catch (err) {
      console.error(`${Date.now()} - email_log migration step failed:`, err);
    }
  }
})();

// Every /api/email-log/* route is admin-only.
router.use("/api/email-log", authorize.authorize_admin);

// GET /api/email-log/categories — category summary for the top-level list (US1).
router.get("/api/email-log/categories", (req, res) => {
  try {
    const { categories, total } = emailLogService.getCategories();
    return res.json({ status: true, categories, total });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

// GET /api/email-log/entries — paged drill-down (US2) + recipient search (US3).
router.get("/api/email-log/entries", (req, res) => {
  try {
    const { category, search, page, pageSize } = req.query;
    const result = emailLogService.queryEntries({
      category,
      search,
      page,
      pageSize,
    });
    return res.json({ status: true, ...result });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
