const express = require('express');
const router = express.Router();

const dbService = require("../services/dbService");

router.post("/account-deletion-request", express.json(), async (req, res) => {
  try {
    const {
      fullName,
      email,
      memberId,
      phone,
      country,
      reason,
      requestSource,
      requestedAt,
    } = req.body;

    // Validation
    if (!fullName || !email) {
      return res.status(400).json({
        success: false,
        message: "Full name and email are required.",
        error: "VALIDATION_ERROR",
      });
    }

    const db = dbService.getDB();

    const stmt = db.prepare(`
      INSERT INTO account_deletion_requests
      (full_name, email, member_id, phone, country, reason, request_source, requested_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      fullName,
      email,
      memberId || null,
      phone || null,
      country || null,
      reason || null,
      requestSource || "app",
      requestedAt || new Date().toISOString()
    );

    if (result.changes === 1) {
      return res.status(201).json({
        success: true,
        message:
          "Your account deletion request has been submitted successfully. Our team may contact you to verify your identity before processing.",
        data: {
          requestId: result.lastInsertRowid,
        },
      });
    }

    return res.status(400).json({
      success: false,
      message: "Unable to process your request. Please try again.",
      error: "INSERT_FAILED",
    });

  } catch (error) {
    console.error("Account deletion error:", error);

    return res.status(500).json({
      success: false,
      message:
        "An unexpected error occurred while submitting your request. Please try again later.",
      error: "INTERNAL_SERVER_ERROR",
    });
  }
});

module.exports = router;