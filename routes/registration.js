const express = require('express');
const router = express.Router();
const { exportTableAsCSV } = require("../services/csvParser");
const dbService = require("../services/dbService");
const multer = require("multer");
const { generateQRWithText } = require("../services/qrGenerator");
const { validateFileMimeType } = require("../services/validateFileType");
const { comfirm_message_email, event_confirm_registration_email, company_data_confirmation_email, gic__reset_password, email_request_received, membership_courtacy_at_venue_message } = require("../services/emailService");
const { generatePassword, hashPassword } = require("../services/userService");
const { generateRecordId } = require("../services/generatorService");
const path = require("path");
const fs = require("fs");
require('dotenv').config();
const jwt = require("jsonwebtoken");
const authorization_middleware = require("../middleware/auth");
const rateLimit = require("express-rate-limit");
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc'); 
const timezone = require('dayjs/plugin/timezone'); 
const {generateApplePass} = require('../services/applePassService');
const {generateGooglePass} = require('../services/googlePassService');

dayjs.extend(utc);
dayjs.extend(timezone);

// Create rate limiter
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 5 minutes
    max: 5,                   // limit each IP to 5 requests per window
    message: {
        status: 429,
        error: "Too many login attempts, please try again after 15 minutes."
    },
    headers: true,
    skipSuccessfulRequests: true // built-in option to skip successful responses
});

const upload = multer({
    storage: multer.memoryStorage()
    , limits: { fileSize: 5 * 1024 * 1024 }
}); // 5MB max

router.post("/registration", upload.single('attachment_file'), async (req, res) => {
    try {

        const userTimezone = req.get('X-User-Timezone'); 
        const langKey = req.get('X-User-Lang'); 
        let table_name = "registration";

        const { registration_code, title, event_date, ...data } = req.body;
        const reg_config = await dbService.findExact("registration_config", "page", data.event);
        const file = req.file;
        let uniqueFileName = null;
        // Validate file type
        if (file) {
            const result = await validateFileMimeType(req.file);
            if (!result.valid) {
                return res.status(400).json({ status: false, message: result.reason });
            }

            // Save file after validation
            uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(req.file.originalname)}`;
            const targetPath = path.join("file_storage", uniqueFileName);
            fs.writeFileSync(targetPath, req.file.buffer);
        }


        const key = await dbService.findExact("registration_keys", "key", registration_code);
        const event_time = reg_config[0]?.event_time;
        const event_location = reg_config[0]?.event_location;
        const event_location_name = reg_config[0]?.event_location_name;


        // Max token doesn't mean anything for sending out documents like applying for Golden Adler award 
        if (!file) {

            // Convert to numbers
            const maxTokens = Number(reg_config[0]?.maxTokensPerGuest);
            let currentCount = 0;
            if (key && key.length > 0) {
                currentCount = Number(key[0].tokenCount);
            } else {
                const count_token = await dbService.findByConditions("registration", {
                    email: data.email,
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
        let selected_time_for_email = "";

        if (data.company_data) {
            table_name = "Company";
            const { event, event_id, company_data } = data;
            const company_data_ = JSON.parse(company_data);
            const company_data__ = Object.fromEntries(
                Object.entries(company_data_)
                    .map(([key, value]) => [key.replace(/^company_/, ""), value])
            );
            company_data__.event = event;
            company_data__.event_id = event_id;

            create_result = dbService.create(table_name, company_data__);
        } else if (data.gic_data) {

            table_name = "GIC_Users";
            const gic_data_ = JSON.parse(data.gic_data);
            const gic_data__ = Object.fromEntries(
                Object.entries(gic_data_)
                    .map(([key, value]) => [key.replace(/^gic_/, ""), value])
            );


            const duplicateRecord = await dbService.countExact(table_name, 'email', gic_data__.email);
            if (duplicateRecord.count > 0) {
                return res.json({
                    status: false,
                    message: "This email has already been taken. Please use a different one."
                });
            }

            const initialPassword = generatePassword();
            gic_data__.password_hash = await hashPassword(initialPassword);
            gic_data__.change_password_required = "true";
            const create_result = dbService.create(table_name, gic_data__);

            if (create_result.status) {
                await gic__reset_password({ email: gic_data__.email, password: initialPassword });
                return res.json({
                    status: true,
                    message: "Your account has been created successfully. A temporary password has been sent to your email. Please use it to log in and reset your password.",
                    create_result
                });
            }
        }
        else {


            const metadata = {};
            Object.entries(data).forEach(([key, value]) => {
                if (key.startsWith("metadata_")) {
                    
                    if (value !== null && value!== "") {

                        // Strip the prefix if you want clean keys in JSON
                        const cleanKey = key.replace("metadata_", "");
                        metadata[cleanKey] = value;
                    }
                }
                
            });

            if (Object.keys(metadata).length > 0) {
               
                const config_metadata = JSON.parse(reg_config[0].metadata_json);

                if (data.metadata_selected_time) {
                    // Convert selected_time to Date object
                    
                    const selectedDate_UTC = dayjs(data.metadata_selected_time).utc();
                    const selectedDate = selectedDate_UTC.tz(userTimezone);
                    const selectedHour = selectedDate.hour();
                    selected_time_for_email = `${selectedHour}:00`;


                    // Fill the slot for that hour with the selected_time
                    if (config_metadata.slots && config_metadata.slots.hasOwnProperty(selectedHour)) {
                        config_metadata.slots[selectedHour] = {hour: selectedHour, registerant_info:{
                            fullname: `${data.firstName} ${data.lastName}`,
                            email:data.email,
                            phoneNumber:data.phone
                        }};
                    }
                }


               Object.keys(data).forEach((key) => {
                    if (key.startsWith("metadata_")) {
                        delete data[key];
                    }
                });
                
                data.metadata_json =  JSON.stringify(metadata);
                reg_config[0].metadata_json = JSON.stringify(config_metadata);
                try{
                    await dbService.update("registration_config", reg_config[0].id, reg_config[0]);

                }catch(err){
                    return res.status(400).json({ status: false, message: 'This slot has already been reserved. Please clear the cache using the Clear Cache button and try again.' });
                }
            }else{
                 Object.keys(data).forEach((key) => {
                    if (key.startsWith("metadata_")) {
                        delete data[key];
                    }
                });
            }

            create_result = dbService.create(table_name, data);
        }

        if (create_result.status) {
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

                    if(event_date){
                        await generateQRWithText(data.event, data.event_id);
                    }

                    // Add Title for email
                    data.title = title;
                    data.event_date = event_date;
                    data.event_time = event_time;
                    data.event_location = event_location;
                    data.event_location_name = event_location_name;

                    if(event_date){
                        
                        await generateApplePass(data);
                        
                        console.log(data);
                         const googleWalletLink = await generateGooglePass(data);
                        await event_confirm_registration_email({ ...data, selected_time_for_email, googleWalletLink, langKey });
                        
                    }else{
                        await email_request_received(data);
                    }
                    break;
                }
            }

            return res. json({ status: true, message: "Your request has been successfully processed.", create_result });
        }

        return res.json({ status: false, message: create_result.error });

    } catch (error) {
        console.error("Edit error:", error);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

router.get('/api/registration',  async (req, res) => {
    try {

        const { filters, data } = await dbService.QuerySqlConverter(req.query, "registration AS r", {
            table: "event_proforma_invoice AS e",
            on: "r.event_id = e.userId",

        },
            [
                "r.*",          // all columns from registration (aliased as r)
                "e.status"      // only the status column from event_proforma_invoice (aliased as e)
            ]);


        // remove the alias from query 
        const _filters = {};
        if(filters){
            for (const key in filters) {
                var newKey = key.replace("r.", "");
                
                _filters[newKey] = filters[key];

            }
        }

        const total = await dbService.getTotalCount("registration", _filters);

        return res.     json({
            status: true,
            data,
            total
        });

    } catch (error) {
        console.error("Error in /registration:", error);
        res.status(500).json({ status: false, message: 'Server error' });
    }
});

router.get('/api/registration-csv-data',  async (req, res) => {
    try {

        const data = await dbService.findAll("registration");

        if(data){
            data.forEach(x=>{
                if(x.metadata_modifiedAt){
                    x.completed = true;
                }else{
                    x.completed = false;
                }
            })
        }
        const csv = await exportTableAsCSV(data); // Await CSV generation

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=registration-data-${Date.now()}.csv`
        );
        res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
        res.send(csv); // Send the actual CSV string

    } catch (error) {
        console.error("Error in fetching data from sql server:", error);
        res.status(500).json({ status: false, message: 'Server error' });
    }
});

const pad = (n) => n.toString().padStart(2, '0');
function formatDateToMySQL(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

router.post("/complete-registration", upload.none(), async (req, res) => {
    try {
        let table_name = "registration";
        const data = req.body;
        const result = await dbService.findExact(table_name, "event_id", data.event_id);
        const membershipResult = await dbService.findExact("member_card", "serial_number", data.event_id);

        if (result && result.length > 0) {
            const record = result[0];

            if (record.metadata_modifiedAt !== null) {
                return res.status(409).json({
                    status: true,
                    message: "This QR code has already been used for registration. Please contact support if you believe this is an error.",
                    record
                });
            }

            record.metadata_modifiedAt = formatDateToMySQL(new Date(Date.now()));
            dbService.update(table_name, record.id, record)
            return res.status(200).json({
                status: true,
                message: "Guest registration completed successfully. Thank you for your submission.",
                record
            });
        }



        if (membershipResult && membershipResult.length > 0) {

            // 1 - SEND QUERY TO DB AND GET A LIST OF REGISTRATION WHERE THE DATE NOW IS EQUAL TO EVENT DATE
            // 2 - USE THE MEMBERSHIPRESULT AND REGISTRATION CONFIG AND CREATE A RECORD
            // 3 - NOTIFY THEM WITH EMAIL LIKE WELCOME AND THANKS FOR USING OUR MEMBERSHIP
            // 4 - CHECK IF ALREADY THE RECORD CREATED

            const registration_config_query = await dbService.registration_config_auto_register();
            if(registration_config_query.length === 0){
        
                return res.status(404).json({
                    status: false,
                    message: "There are no events at the current date and time"
                });

            }

            const registration_config = registration_config_query[0];
            const member = membershipResult[0];
            

            const alreadyCompleted = await dbService.findByConditions("registration", {
                event: registration_config.page,
                email : member.email,
                message : "AUTO_MEMBERSHIP_REGISTER"
            });


           if (alreadyCompleted.length > 0) {
                return res.status(200).json({
                    status: false,
                    message: "This guest registration has already been completed. I’m smart! 🤖",
                    record: alreadyCompleted[0]
                });
            }


            const birthday = new Date(member.birthday);
            const registerant = {
                event_id : generateRecordId(registration_config.page, false),
                event : registration_config.page,
                email : member.email,
                message : "AUTO_MEMBERSHIP_REGISTER",
                phone : member.mobile_number ,
                whatsapp : member.mobile_number ,
                firstName : member.firstname ,
                lastName : member.lastname ,
                birthday : `${birthday.getFullYear()}-${pad(birthday.getMonth() + 1)}-${pad(birthday.getDate())} ` ,
                metadata_modifiedAt : formatDateToMySQL(new Date(Date.now()))
            }

        
            
            const create_result = dbService.create("registration", registerant);
 

            if (create_result.status) {
                await membership_courtacy_at_venue_message({ firstName : member.firstname ,lastName : member.lastname ,email : member.email, event: registration_config.page})
                return res.json({
                    status: true,
                    message: "Guest registration completed successfully. Thank you for your submission.",
                    record: registerant
                });
            }
        }


        return res.status(404).json({
            status: false,
            message: "No registration record found for the provided event ID."
        });

    } catch (error) {
        console.error("Edit error:", error);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

router.post("/admin/login", upload.none(), loginLimiter, (req, res) => {
    const { password } = req.body;

    if (password === process.env.VITE_ADMIN_PASSWORD) {

        const oneWeekInSeconds = 7 * 24 * 60 * 60;
        const oneWeekInMilliseconds = oneWeekInSeconds * 1000;

        const token = jwt.sign(
            { role: "admin", mapboxToken: process.env.VITE_APP_MAPBOX_TOKEN },
            process.env.JWT_SECRET,
            { expiresIn: `${oneWeekInSeconds}s` }
        );

       res.cookie("a-usr", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: oneWeekInMilliseconds, 
        });

        return res.json({ success: true });
    }

    // Invalid password counts towards rate limit
    return res.status(401).json({ error: "Invalid password" });
}
);





router.post("/admin/logout", (req, res) => {
    const token = req?.cookies["a-usr"];
    if (!token) {
        return res.status(401).json({ authenticated: false, message: "No token found" });
    }

    try {
        // Clear the cookie
        res.clearCookie("a-usr", {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            path: "/",
        });

        return res.json({ authenticated: false, message: "Logged out successfully" });
    } catch (err) {
        return res.status(401).json({ authenticated: false, message: "Invalid or expired token" });
    }
});


router.get("/admin/check-auth", (req, res) => {
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


router.get("/registration-data/:id", upload.none(), async (req, res) => {
     try {
        
        const { id } = req.params;
        const data = await dbService.findByColumn("registration", "event_id", id)
    
        return res.status(200).send(data);
        
    } catch(err) {
        return res.status(401).json({ message: err });
    }
});


module.exports = router;