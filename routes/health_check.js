
const express = require('express');
const router = express.Router();


const websites = [
        "https://experts.german-emirates-club.com/health",
        "https://www.german-emirates-club.com/api",
        "https://www.angels-bureau.com/health",
        "https://www.difa.agency/health",
        "https://www.palm-x.com/health",
    ];

router.get('/api/health-check', async (_req, res) => {
  try {
    const timestamp = Date.now();
    const results = await Promise.all(
      websites.map(async (url) => {
        try {
          const response = await fetch(url, { method: "GET" });
          return {
            url,
            status: response.status === 200 ? "up" : "down",
            lastChecked: timestamp
          };
        } catch {
          return {
            url,
            status: "down",
            lastChecked: timestamp
          };
        }
      })
    );

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Health check failed" });
  }
});

module.exports = router;