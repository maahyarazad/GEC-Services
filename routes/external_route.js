const express = require("express");
const path = require("path");
const fs = require("fs");

const router = express.Router();


router.get("/api/qr", (req, res) => {
  const { event, event_id } = req.query;

  if (!event || !event_id) {
    return res.status(400).json({
      success: false,
      message: "Missing query parameters: event_page or code",
    });
  }

  const filePath = path.join(
    __dirname,
    "..",
    "qr-files",
    event,
    `${event_id}.png`
  );

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      message: "QR file not found",
    });
  }

  return res.sendFile(filePath);
});


module.exports = router;
