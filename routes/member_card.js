const express = require("express");
const router = express.Router();
const path = require("path");
const fetch = require("node-fetch");
const dbService = require("../services/dbService");
require('dotenv').config();
const multer = require("multer");
const authorize_admin = require("../middleware/auth");
const {exportTableAsCSV} = require('../services/csvParser');

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


router.get('/api/member-card-csv-data', authorize_admin, async (req, res) => {
    try {

        const data = await dbService.findAll("member_card");

        const csv = await exportTableAsCSV(data); // Await CSV generation

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=membership-data-${Date.now()}.csv`
        );
        res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
        res.send(csv); // Send the actual CSV string

    } catch (error) {
        console.error("Error in fetching data from sql server:", error);
        res.status(500).json({ status: false, message: 'Server error' });
    }
});

router.get('/api/member_card_report', authorize_admin,async (req, res) => {
    try {
        
        const table_name = "member_card";
        const now = new Date(); // current date
        const year = now.getFullYear() - 1;
        const this_month = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        const nextMonthDate = new Date(year, now.getMonth() + 1, 1);
        const next_month = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}`;
        

        const expiring_soon_count = await dbService.countExactWithConditions(table_name, {
            card_expiry_date: { op: "BETWEEN", value: [this_month, next_month] }
            });
        

        const expired = await dbService.countExactWithConditions(table_name, {
            card_expiry_date: { op: "<", value: this_month }
            });

        const count_total_valid = await dbService.countExactWithConditions(table_name, {
            card_expiry_date: { op: ">", value: this_month }
            });

        const blue_paid = await dbService.countExactWithConditions(table_name, {
            type: { op: "=", value: 1 }
            });

        const blue_non_paid = await dbService.countExactWithConditions(table_name, {
            type: { op: "=", value: 5 }
            });


        const red = await dbService.countExactWithConditions(table_name, {
            type: { op: "=", value: 7 }
            });

        return res.json({
            status: true,
            data:{
                expired: expired,
                expiring_soon_count: expiring_soon_count,
                count_total_valid: count_total_valid,
                blue_paid: blue_paid,
                blue_non_paid: blue_non_paid,
                red: red
            }
        });

    } catch (error) {
        console.error("Error in /member:", error);
        res.status(500).json({ status: false, message: 'Server error' });
    }
});



module.exports = router;
