const express = require('express');
const router = express.Router();
const dbService = require("../services/dbService");
const authorize_admin = require("../middleware/auth")
const { exportTableAsCSV } = require("../services/csvParser");

router.get('/api/survey', authorize_admin, async (req, res) => {
  try {
  
    const { filters, data } = await dbService.QuerySqlConverter(req.query, "Company");
    
    const total = await dbService.getTotalCount("Company", filters);

    return res.json({
      status: true,
      data,
      total
    });
    
  } catch (error) {
    console.error("Error in /registration:", error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
});


router.get('/api/survey-csv-data', authorize_admin, async (req, res) => {
    try {

        const data = await dbService.findAll("company");

        const csv = await exportTableAsCSV(data); // Await CSV generation

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=survey-data-${Date.now()}.csv`
        );

        res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
        res.send(csv); // Send the actual CSV string

    } catch (error) {
        console.error("Error in fetching data from sql server:", error);
        res.status(500).json({ status: false, message: 'Server error' });
    }
});

module.exports = router;
