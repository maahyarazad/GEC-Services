const express = require('express');
const router = express.Router();
const dbService = require("../services/dbService");

const { exportTableAsCSV } = require("../services/csvParser");

router.get('/api/survey',  async (req, res) => {
  try {
  
    const { filters, data } = dbService.QuerySqlConverter(req.query, "Company");
    
    const total = dbService.getTotalCount("Company", filters);

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


router.post('/api/update-survey',  async (req, res) => {
  try {
    const { data } = req.body;

    if (!data || !data.id) {
      return res.status(400).json({
        status: false,
        message: "Invalid request: 'id' is required to update the survey.",
      });
    }

    const updated = dbService.update("Company", data.id, data);

    if (!updated) {
      return res.status(404).json({
        status: false,
        message: `No survey found with id: ${data.id}`,
      });
    }

    return res.json({
      status: true,
      message: `Survey with Id ${data.id} successfully updated.`,
      data: updated, // optional, return updated record
    });

  } catch (error) {
    console.error("Error in /api/update-survey:", error);
    res.status(500).json({
      status: false,
      message: "Internal server error while updating survey.",
      error: error.message, // optional
    });
  }
});



router.get('/api/delete-survey',  async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        status: false,
        message: "Missing required parameter: id",
      });
    }

    console.log(`🗑️ Deleting survey with ID: ${id}`);

    const result = dbService.remove("Company", id);

    if (!result) {
      return res.status(404).json({
        status: false,
        message: `Survey with ID ${id} not found.`,
      });
    }

    return res.status(200).json({
      status: true,
      message: `Survey with ID ${id} has been successfully deleted.`,
    });
  } catch (error) {
    console.error("❌ Error in /api/delete-survey:", error);
    return res.status(500).json({
      status: false,
      message: "An unexpected server error occurred while deleting the survey.",
      error: error.message,
    });
  }
});


router.get('/api/survey-csv-data',  async (req, res) => {
    try {

        const data = dbService.findAll("company");

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
