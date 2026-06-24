const express = require('express');
const router = express.Router();
const dbService = require("../services/dbService");
const GSheetService = require("../services/gSheetService");


router.get('/api/google-auto-register', async (req, res) => {
    try {

        if(!req.query){
            return res.status(400).json({
                status: false,
                message: `Event is missing`,
            });
        }
        
        const event = req.query.event;
        const result = await GSheetService.InvitationParser(event);
        const { totalComplete, totalFail } = result.reduce((acc, x) => {
            if (x.completed) {
                acc.totalComplete++;
            } else {
                acc.totalFail++;
            }
            return acc;
        }, { totalComplete: 0, totalFail: 0 });

        return res.status(200).json({
            status: true,
            message: `✅ ${totalComplete} email addresses were successfully registered, and ❌ ${totalFail} failed to process.`,
        });


    } catch (err) {
        console.error(`${Date.now()} - Error auto register from G Sheet:`, err);
        return res.status(500).json({
            status: false,
            message: "Server error",
            error: err.message,
        });
    }
});

module.exports = router;
