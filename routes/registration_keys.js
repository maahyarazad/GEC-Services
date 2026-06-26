const express = require('express');
const router = express.Router();
const dbService = require("../services/dbService");

router.post("/api/registration-keys",async (req, res) => {
    try {
        const table_name = "registration_keys";
        const data = req.body;

        const result = dbService.findExact(table_name, "registration_config_id", Number(data.id));
        
        if (result) {
            return res.status(200).json({ status: true, data: result });
        } else {
            return res.status(404).json({ status: false, message: "Bad Request! Record not found" });
        }

    } catch (error) {
        console.error(`${Date.now()} - Edit error:`, error);
        return res.status(500).json({ status: false, message: error.message });
    }
});

module.exports = router;
