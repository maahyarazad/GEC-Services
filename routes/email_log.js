const express = require("express");
const router = express.Router();
const dbService = require("../services/dbService");
const db = dbService.getDB();
const authorize = require("../middleware/auth");
const emailLogService = require("../services/emailLogService");


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
