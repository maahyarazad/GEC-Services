const express = require("express");
const router = express.Router();
const dbService = require("../services/dbService");
require("dotenv").config();
const db = dbService.getDB();

router.get(
  "/partners-onboarding/sync-stat",
  async (req, res) => {
    try {
      const apiKey = req.headers["x-api-key"];

      if (!apiKey || apiKey !== process.env.SERVICES_SECRET) {
        return res.status(401).json({
          status: false,
          message: "Unauthorized",
        });
      }
      const query = `
       SELECT partner, COUNT(DISTINCT mobile_number) AS total_records
    FROM partner_onboarding_data
    WHERE metadata_createdAt >= datetime('now', '-3 month')
      AND synchronized = 1 
    GROUP BY partner;
    `;

      const stmt = db.prepare(query);
      const syncPartners = stmt.all();

      if (syncPartners.length > 0) {
        return res.status(200).json({
          status: true,
          data: syncPartners,
        });
      } else {
        return res.status(404).json({
          status: false,
          message: "No sync partner found",
        });
      }
    } catch (error) {
      console.error("Error getting sync partner:", error.message);
      return res.status(500).json({
        status: false,
        message: "An unexpected server error occurred. Please try again later.",
      });
    }
  }
);

module.exports = router;
