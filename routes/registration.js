const express = require('express');
const router = express.Router();
const { exportTableAsCSV } = require("../services/csvParser");
const dbService = require("../services/dbService");
const multer = require("multer");
const  {generateQRWithText} = require("../services/qrGenerator");
const  {validateFileMimeType} = require("../services/validateFileType");
const {comfirm_message_email, event_confirm_registration_email, company_data_confirmation_email, gic__reset_password} = require("../services/emailService");
const {generatePassword, hashPassword} = require("../services/userService");
const { generateRecordId } = require("../services/generatorService");
const path = require("path");
const fs = require("fs");
require('dotenv').config();
const jwt = require("jsonwebtoken");
const authorize_admin = require("../middleware/auth");

const upload = multer({ 
    storage: multer.memoryStorage()
    , limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB max

router.post("/registration", upload.single('attachment_file'), async (req, res) => {
    try {
        
        let table_name = "registration";
        const {registration_code, title, event_date ,...data} = req.body;
        const file = req.file; 
        let uniqueFileName = null;
        // Validate file type
        if(file){
            const result = await validateFileMimeType(req.file);
            if (!result.valid) {
                return res.status(400).json({ status: false, message: result.reason });
            }
    
             // Save file after validation
            uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname)}`;
            const targetPath = path.join("file_storage", uniqueFileName);
            fs.writeFileSync(targetPath, req.file.buffer);
        }


        let event_time;
        let event_location;
        let event_location_name;

        const key = await dbService.findExact("registration_keys", "key", registration_code);

        // Max token doesn't mean anything for sending out documents like applying for Golden Adler award 
        if(!file){
            const max_token_value = await dbService.findExact("registration_config", "page", data.event);
            event_time = max_token_value[0]?.event_time;
            event_location = max_token_value[0]?.event_location;
            event_location_name = max_token_value[0]?.event_location_name;

            // Convert to numbers
            const maxTokens = Number(max_token_value[0]?.maxTokensPerGuest);
            let currentCount = 0;
            if(key && key.length > 0){
                currentCount = Number(key[0].tokenCount);
            }else{                
                const count_token = await dbService.findByConditions("registration", {
                    phone: data.phone,
                    event: data.event
                });

                currentCount = Number(count_token.length);
            }
            
            
            // Max Token Check
            if (isNaN(maxTokens) || isNaN(currentCount)) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid registration configuration or user data.",
                });
            }
    
            if (currentCount >= maxTokens) {
                return res.status(413).json({
                    status: false,
                    message: "You have reached the maximum number of registrations allowed for this event.",
                });
            }
        }

        // You can check if file was sent
        if (file) {
            data.attachment_file = uniqueFileName;
        } 


        data.event_id = generateRecordId(data.event, false);
        let create_result;


        if(data.company_data){
            table_name = "Company";
            const {event, event_id, company_data} = data;
            const company_data_ = JSON.parse(company_data);
            const company_data__ = Object.fromEntries(
                Object.entries(company_data_)
                    .map(([key, value]) => [key.replace(/^company_/, ""), value])
                );
            company_data__.event = event;
            company_data__.event_id = event_id;

            create_result = await dbService.createSafe(table_name, company_data__);
        }else if(data.gic_data){

            table_name = "GIC_Users";
            const gic_data_ = JSON.parse(data.gic_data);
            const gic_data__ = Object.fromEntries(
                Object.entries(gic_data_)
                    .map(([key, value]) => [key.replace(/^gic_/, ""), value])
                );

                
            const duplicateRecord = await dbService.countExact(table_name, 'email', gic_data__.email);
            if(duplicateRecord.count > 0){
                return res.json({ 
                    status: false, 
                    message: "This email has already been taken. Please use a different one." 
                });
            }

            const initialPassword = generatePassword();
            gic_data__.password_hash = await hashPassword(initialPassword);
            gic_data__.change_password_required = "true";
            const create_result = await dbService.createSafe(table_name, gic_data__);

        if (create_result.status) {
                await gic__reset_password({ email: gic_data__.email, password: initialPassword });
                return res.json({
                    status: true,
                    message: "Your account has been created successfully. A temporary password has been sent to your email. Please use it to log in and reset your password.",
                    create_result
                });
            }
        }
        else{
            create_result = await dbService.createSafe(table_name, data);
        }

        if(create_result.status){
            switch (true) {
                case !!file: {
                    // Case 1: File exists
                    await comfirm_message_email(data);
                    break;
                }

                case !!data.company_data: {
                    // Case 2: company_data exists
                    
                    await company_data_confirmation_email(data);
                    break;
                }

                default: {
                    // Case 3: Default (no file, no company_data)

                    // Increment the tokenCount here
                    if (key && key.length > 0) {
                        key[0].tokenCount++;
                        dbService.update("registration_keys", key[0].id, key[0]);
                    }

                    await generateQRWithText(data.event, data.event_id);

                    // Add Title for email
                    data.title = title;
                    data.event_date = event_date;
                    data.event_time = event_time;
                    data.event_location = event_location;
                    data.event_location_name = event_location_name;

                    await event_confirm_registration_email(data);
                    break;
                }
            }
            
            return res.json({ status: true, message: "Your request has been successfully processed.", create_result });
        }

        return res.json({ status: false, message: create_result.error });

    } catch (error) {
        console.error("Edit error:", error);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

router.get('/registration',authorize_admin, async (req, res) => {
  try {
  
    const { filters, data } = await dbService.QuerySqlConverter(req.query, "registration AS r", {
        table: "event_proforma_invoice AS e",
        on: "r.event_id = e.userId",
        
    },
    [
    "r.*",          // all columns from registration (aliased as r)
    "e.status"      // only the status column from event_proforma_invoice (aliased as e)
    ]);
    
    const total = await dbService.getTotalCount("registration", filters);

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

router.get('/registration-csv-data', authorize_admin,async (req, res) => {
  try {
  
    const data = await dbService.findAll("registration");
    
    const csv = await exportTableAsCSV(data); // Await CSV generation

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=registration-data-${Date.now()}.csv`
    );

    res.send(csv); // Send the actual CSV string
    
  } catch (error) {
    console.error("Error in fetching data from sql server:", error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
});

function formatDateToMySQL(date) {
  const pad = (n) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
         `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

router.post("/complete-registration", upload.none(), async (req, res) => {
    try {
        let table_name = "registration";
        const data = req.body;
        const result = await dbService.findExact(table_name, "event_id", data.event_id);

        if(result && result.length > 0){
            const record = result[0];
            record.metadata_modifiedAt = formatDateToMySQL(new Date(Date.now()));
            dbService.update(table_name, record.id,record )
            return res.json({ 
                status: true, 
                message: "Guest registration completed successfully. Thank you for your submission.",
                record
            });

        }
        
        // If no result found
        return res.json({ 
            status: false, 
            message: "No registration record found for the provided event ID." 
        });

    } catch (error) {
        console.error("Edit error:", error);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

router.post("/api/admin/login", (req, res) => {
  const { password } = req.body;

  if (password === process.env.VITE_ADMIN_PASSWORD) {
    const token = jwt.sign({ role: "admin",  mapboxToken: process.env.VITE_APP_MAPBOX_TOKEN  }, process.env.JWT_SECRET, { expiresIn: "1h" });

    // Set token in secure httpOnly cookie
    res.cookie("a-usr", token, {
      httpOnly: true,                     // cannot be accessed via JS
      secure: true,                       // HTTPS only
      sameSite: "none",                   // allow cross-site cookie
      maxAge: 60 * 60 * 1000              // 1 hour
    });

    
    return res.json({ success: true });
  }

  res.status(401).json({ error: "Invalid password" });
});

router.get("/api/admin/check-auth", (req, res) => {
  const token = req?.cookies["a-usr"];
  if (!token) return res.status(401).json({ authenticated: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === "admin") {
      return res.json({ authenticated: true });
    }
    return res.status(401).json({ authenticated: false });
  } catch {
    return res.status(401).json({ authenticated: false });
  }
});




module.exports = router;