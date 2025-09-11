const express = require("express");
const router = express.Router();
const path = require("path");
const fetch = require("node-fetch");
const dbService = require("../services/dbService");
require('dotenv').config();
const multer = require("multer");
const authorize_admin = require("../middleware/auth");

const upload = multer({
    storage: multer.memoryStorage()
    , limits: { fileSize: 5 * 1024 * 1024 }
}); // 5MB max

const fs = require("fs").promises;
// keep only DB table columns



router.get('/api/member_card', authorize_admin,async (req, res) => {
    try {
        
        const table_name = "member_card";
        const { filters, data } = await dbService.QuerySqlConverter(req.query, table_name);

        const total = await dbService.getTotalCount(table_name, filters);

        return res.json({
            status: true,
            data,
            total
        });

    } catch (error) {
        console.error("Error in /member:", error);
        res.status(500).json({ status: false, message: 'Server error' });
    }
});



module.exports = router;
