const express = require('express');
const router = express.Router();
const dbService = require("../services/dbService");
const { send_party_invitation } = require("../services/emailService");


// ✅ Accept query parameters using GET
router.get('/api/send-party-invitation', async (req, res) => {
    try {
        const queryParams = req.query;

        const conditions = { 
            type: Number(queryParams.type), 
            email: "IS NOT NULL"  // special marker instead of a value
        };

        const data = dbService.findExactWithConditions('member_card', conditions)

        const email = "maahyarazad@gmail.com";
        // const trim = "Krishna.Kumar@logwin-logistics.com";
 

        // const index = data.findIndex(obj => obj.email === trim);
        // const _data = data.slice(index + 1);


        for (let i = 0; i < data.length; i++) {
            const k = data[i];
            try {
                await send_party_invitation({ email: k.email });
                console.log(`${Date.now()} - ✅ Sent to: ${k.email}`);

                
                await new Promise(r => setTimeout(r, 10));

                
                if ((i + 1) % 30 === 0) {
                    console.log(`${Date.now()} - ⏸️ Pausing for 5 minutes to avoid SMTP limits...`);
                    await new Promise(r => setTimeout(r, 5 * 60 * 1000)); 
                }

            } catch (err) {
                console.error(`${Date.now()} - ❌ Failed for ${k.email}:`, err.message);
            }
        }


        return res.status(200).json({
            status: true,
            message: `Email sent successfully${queryParams.type ? ` (${queryParams.type})` : ''}`,
        });

    } catch (err) {
        console.error(`${Date.now()} - Error sending party invitation:`, err);
        return res.status(500).json({
            status: false,
            message: "Server error",
            error: err.message,
        });
    }
});

module.exports = router;
