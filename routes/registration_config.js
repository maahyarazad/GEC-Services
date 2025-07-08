const express = require('express');
const router = express.Router();
const path = require("path");
const dbService = require("../services/dbService");
const multer = require("multer");
const {generateRecordId} = require("../services/generatorService");
const fs = require("fs").promises;
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "file_storage/");
    },
    filename: async (req, file, cb) => {
        const originalName = path.parse(file.originalname).name;
        const extension = path.extname(file.originalname);
        let newFileName = originalName;
        let counter = 1;
        // Check if the file already exists
        let filePath = path.join("file_storage", file.originalname);
        try {
            while (true) {
                try {
                    await fs.access(filePath);
                    newFileName = `${originalName} (${counter})`;
                    filePath = path.join("file_storage", `${newFileName}${extension}`);
                    counter++;
                } catch (err) {
                    break;
                }
            }
            cb(null, `${newFileName}${extension}`);
        } catch (error) {
            cb(error);
        }
    },
});

const upload = multer({ storage: storage });
router.post("/registration-config", upload.single('image'), async (req, res) => {
    try {
        const table_name = "registration_config";
        const data = req.body
        const { uniqeCodeAccess, ...registration_data } = data;

        // EDIT MODE
        if (registration_data.id) {
            const existing = await dbService.findById(table_name, registration_data.id);
            if (!existing) {
                return res.status(404).json({ status: false, message: "Record not found" });
            }

            // Check duplicate
            const duplicate_record = await dbService.findByColumn(table_name, "page", registration_data.page);
            if (duplicate_record && duplicate_record.id !== existing.id) {
                return res.status(400).json({ status: false, message: "A duplicate record with the same page URL was found." });
            }

            if (req.file) {
                registration_data.image = req.file.filename;
            }
            // Update record (registration_code should not change if not re-generated)
            const updated = await dbService.update(table_name, registration_data.id, {
                ...registration_data,
                modifiedAt: new Date().toISOString(),
            });
            return res.json({ status: true, message: "Record updated successfully", registration_data: updated });
        }

        // Check duplicate
        const duplicate_record = await dbService.any(table_name, "page", registration_data.page);
        if (duplicate_record > 0) {
            return res.status(400).json({ status: false, message: "Duplicate record found." });
        }


        if (req.file) {
            data.image = String(req.file.filename);
        }
        
        // uniqeCodeAccess Logic goes here

        const code_list = [];
        if(Number(data.uniqeCodeAccess) > 1){

            const members = await dbService.findExact("Member","active_member" , true);
            for(let i = 0; i< Number(data.uniqeCodeAccess) ;i++){
                code_list.push({
                    key: generateRecordId(data.page, -6),
                    memberId: members[i].id
                });
            }


        }



        if(code_list.length > 0){
            const insert_data = await dbService.insertWithKeys("registration_config", registration_data, code_list);
            res.json({ status: true, message: "Data saved successfully", insert_data });
        }else{
            registration_data.registration_code = generateRecordId(data.page, -6, false);
            const insert_data = await dbService.create(table_name, registration_data);
            res.json({ status: true, message: "Data saved successfully", insert_data });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

router.post("/registration-config/switch-registration-lock", upload.single('none'), async (req, res) => {
    try {
        const table_name = "registration_config";
        const { Image, ...data } = req.body;

        const id = data.id;

        // Check if the record exists
        const existing = await dbService.findById(table_name, id);
        if (!existing) {
            return res.status(404).json({ status: false, message: "Record not found" });
        }

        data.lockRegistration = String(!(data.lockRegistration === "true"));


        const updated = await dbService.update(table_name, id, {
            ...data,
            modifiedAt: new Date().toISOString(),
        });

        res.json({ status: true, message: "Data updated successfully", updated });
    } catch (error) {
        console.error("Edit error:", error);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

router.get("/registration-config", async (req, res) => {
    try {
        const table_name = "registration_config";
        const rows = await dbService.findAll(table_name);


        res.json({ status: true, message: "Data saved successfully", rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

router.post("/registration-config-access", upload.none(), async (req, res) => {
    try {

        const data = req.body;
        // Check duplicate
        const page_data = await dbService.findExact("registration_config", "registration_code", data.registration_code);
        if (!page_data) {
            return res.status(401).json({ status: false, message: "Invalid Authorization Code" });
        }

        // await sendOtpToPhone(data.mobile_number, req, res, client);
        // await dbService.create("registration_client_access", data);

        return res.status(200).json({
            status: true,
            message: "Login Success",
            data: page_data,
            session: req.session,
        });


    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Server error" });
    }
});


module.exports = router;