const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const dbService = require("../services/dbService");
require('dotenv').config();
const multer = require("multer");
const authorization_middleware = require("../middleware/auth");
const { exportTableAsCSV } = require('../services/csvParser');
const { generateMemberPass } = require("../services/applePassService");
const { generateMemberGooglePass } = require("../services/googlePassService");
const uniqid = require('uniqid');
const path = require('path');
const db = dbService.getDB();

const upload = multer({
    storage: multer.memoryStorage()
    , limits: { fileSize: 5 * 1024 * 1024 }
}); // 5MB max

const fs = require("fs").promises;
// keep only DB table columns

function titleToSlug(title) {
    return title
        .toLowerCase()            // convert to lowercase
        .replace(/\s+/g, '-')     // replace spaces (or multiple spaces) with dashes
        .replace(/[^\w-]+/g, ''); // remove any non-alphanumeric characters except dash
}



router.post('/member-card', upload.none(), async (req, res) => {
  try {
    const { username } = req.body;

    const data = dbService.findExact("member_card", "email", username.trim().toLowerCase());

    if (!data || data.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Member not found"
      });
    }

    return res.json({
      status: true,
      data: data[0],
      message: "Success"
    });

  } catch (error) {
    console.error("Error in /member-card:", error);
    return res.status(500).json({
      status: false,
      message: "Server error"
    });
  }
});

router.post('/member-pass', authorization_middleware.authorize_member, async (req, res) => {
    const db = dbService.getDB(); // get your DB connection object
    try {
     
        const memberToken = req.cookies['member-usr'];
        if (!memberToken) {
            return res.status(401).json({
                status: false,
                message: 'No authentication token found. Please authenticate.',
                user: null
            });
        }

        const { member } = req.body;
        const memberId = member?.memberId;
        member.title = "German Emirates Club Membership";

        const _member = dbService.findByColumn("member_card", "email", member.email)[0];
        let applePKpassPath;
        let googlePassToken;


        const expirationDate = new Date(_member.card_expiry_date);

        const now = new Date();
        const timestamp = Date.now();

        const sameMonthAndYear = expirationDate.getFullYear() === now.getFullYear() &&
            expirationDate.getMonth() === now.getMonth();


        let newSerialNumberRequired = false;
        if (!memberId) {
            member.memberId = timestamp;
        }


        
        if (!sameMonthAndYear && expirationDate < now) {
            const newExpiry = new Date(now);
            newExpiry.setFullYear(newExpiry.getFullYear() + 1);
            member.card_expiry_date = newExpiry;
            newSerialNumberRequired = true;
        }

        if (newSerialNumberRequired || !_member.serial_number) {
            member.serial_number = `GEC-${uniqid().toUpperCase()}`;

            await generateMemberPass({ ...req.body, ...member });
            googlePassToken = await generateMemberGooglePass({ ...req.body, ...member });
            
        } else {
            member.serial_number = _member.serial_number;
            googlePassToken = _member.google_pass_token;
        }
        
        const applePath = `${process.env.CLIENT_ORIGIN}/apple_pass/${titleToSlug(member.title)}`;
        applePKpassPath = `${applePath}/${member.serial_number}.pkpass`;

        const updateData = {
            mobile_number: member.mobile_number,
            metadata_modifiedAt: new Date().toISOString(),
            firstname: member.firstname,
            lastname: member.lastname,
            email: member.email,
            serial_number: member.serial_number,
            google_pass_token: googlePassToken,
            birthday: new Date(member.birthday).toISOString()
        };

        // Add memberId only when it doesn’t exist yet
        if (!memberId) {
            updateData.memberId = timestamp;
        }

        // Build the condition dynamically
        const whereCondition = memberId ? { memberId } : { email: member.email };

        const transaction = db.transaction(() => {
                dbService.updateWhere("member_card", updateData, whereCondition);

        })

        transaction();

         return res.status(200).json({
            status: true,
            data: {
                applePassPath: applePKpassPath,
                googlePassPath: googlePassToken
            }
        });
       

    } catch (error) {
          dbService.create("error_log", {
            error: error.toString(),
            origin_function: "createMemberPass_route"
        });

        console.error("Transaction failed:", error);
        res.status(500).json({ status: false, message: 'Server error' });
    }
});


router.post('/member-auto-login', upload.none(), authorization_middleware.authorize_member, async (req, res) => {
    try {

        // const { email, firstname, lastname, mobile_number } = req.body;
        const memberToken = req.cookies['member-usr'];
        if (!memberToken) {
            return res.status(401).json({
                status: false,
                message: 'No authentication token found. Please login.',
                user: null
            });
        }

        const tokenObject = jwt.verify(memberToken, process.env.JWT_SECRET);

        res.status(200).json({ status: true, member: tokenObject.member });


    } catch (error) {
        res.status(500).json({ status: false, message: 'Server error' });
    }
});


router.get('/member-card-login', upload.none(), async (req, res) => {
    const {memberId} = req.query;
    try {
        const memberRecord = dbService.findByConditions("member_card", {
            card_number: memberId
        });
        return res.json({
            status: true,
            message: 'Success',
            memberRecord
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Server error' });
    }
});

router.post('/member-login', upload.none(), async (req, res) => {
    const member = req.body; // get the entire object
    try {
        // Sign the entire member object
        const token = jwt.sign({ member }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.cookie("member-usr", token, {
            httpOnly: true,   // cannot be accessed via JS
            secure: true,     // HTTPS only
            sameSite: "none", // allow cross-site cookie
            maxAge: 60 * 60 * 1000 // 1 hour
        });

        return res.json({
            status: true,
            message: 'Authentication Success'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Server error' });
    }
});


router.post('/member-logout', (req, res) => {
    try {
        // Clear the member-token cookie
        res.clearCookie("member-usr", {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        });

        res.json({
            status: true,
            message: "Member has been logged out successfully.",
        });
    } catch (error) {
        console.error("Error clearing token:", error);
        res.status(500).json({
            status: false,
            message: "Failed to log out. Please try again.",
        });
    }
});


router.get('/api/member_card', async (req, res) => {
    try {

        const table_name = "member_card";
        const { filters, data } = dbService.QuerySqlConverter(req.query, table_name);

        const total = dbService.getTotalCount(table_name, filters);

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


router.get('/api/member-card-csv-data', async (req, res) => {
    try {

        const data = dbService.findAll("member_card");

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

router.get('/api/member_card_report', async (req, res) => {
    try {

        const table_name = "member_card";
        const now = new Date(); // current date
        const year = now.getFullYear() - 1;
        const this_month = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        const nextMonthDate = new Date(year, now.getMonth() + 1, 1);
        const next_month = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}`;


        const expiring_soon_count = dbService.countExactWithConditions(table_name, {
            card_expiry_date: { op: "BETWEEN", value: [this_month, next_month] }
        });


        const expired = dbService.countExactWithConditions(table_name, {
            card_expiry_date: { op: "<", value: this_month }
        });

        const count_total_valid = dbService.countExactWithConditions(table_name, {
            card_expiry_date: { op: ">", value: this_month }
        });

        const blue_paid = dbService.countExactWithConditions(table_name, {
            type: { op: "=", value: 1 }
        });

        const blue_non_paid = dbService.countExactWithConditions(table_name, {
            type: { op: "=", value: 5 }
        });


        const red = dbService.countExactWithConditions(table_name, {
            type: { op: "=", value: 7 }
        });

        return res.json({
            status: true,
            data: {
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


router.post('/member/email', upload.none(), async (req, res) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== process.env.SERVICES_SECRET) {
    return res.status(401).json({
      status: false,
      message: "Unauthorized"
    });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      status: false,
      message: "Email is required"
    });
  }

  try {
    
         const query = `
        SELECT *
FROM member_card mc
WHERE mc.email = '${email.trim().toLowerCase()}'
  AND mc.serial_number IS NOT NULL
  AND DATE('now') <= date(mc.card_expiry_date, 'start of month', '+1 month', '-1 day');
    `;

    const stmt = db.prepare(query);
    const memberRecord = stmt.all();


    if (memberRecord) {
      return res.status(200).json({
        status: true,
        data: memberRecord
      });
    } else {
      return res.status(404).json({
        status: false,
        message: "Email not found"
      });
    }

  } catch (error) {
    console.error("Error checking email:", error);
    return res.status(500).json({
      status: false,
      message: "Server error"
    });
  }
});



module.exports = router;
