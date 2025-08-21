const express = require('express');
const router = express.Router();
const dbService = require("../services/dbService");
router.get('/survey', async (req, res) => {
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


module.exports = router;
