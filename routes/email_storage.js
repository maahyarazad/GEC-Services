const express = require('express');
const router = express.Router();
const dbService = require("../services/dbService");

router.post('/news-letter-email/', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ status: false, message: "Email is required" });
    }

    // Request metadata
    const host = req.get('host'); 
    const fullUrl = req.protocol + '://' + host + req.originalUrl;
    const ip = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Save to DB (include metadata)
    const response = dbService.create("news_letter_emails", {
      email,
      request_source: fullUrl,
    });

    return res.status(201).json({
      status: true,
      message: "Email saved successfully",
    });

  } catch (err) {
    console.error("Error in fetching data from sql server:", err);
    return res.status(500).json({ 
      status: false, 
      message: "Server error", 
      error: err.message 
    });
  }
});

module.exports = router;
