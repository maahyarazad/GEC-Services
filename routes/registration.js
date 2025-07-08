const express = require('express');
const router = express.Router();
const { exportTableAsCSV } = require("../services/csvParser");
const dbService = require("../services/dbService");
const multer = require("multer");
const  {generateQRWithText} = require("../services/qrGenerator");
const {comfirm_message_email, event_confirm_registration_email} = require("../services/emailService");
const { generateRecordId } = require("../services/generatorService");

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

router.post("/registration", upload.single('attachment_file'), async (req, res) => {
    try {
        const table_name = "registration";
        const {registration_code, title,event_date,  ...data} = req.body;
        const file = req.file; 


        const key = await dbService.findExact("registration_keys", "key", registration_code);

        // Max token doesn't mean anything for sending out documents like applying for Golden Adler Ward 
        if(!file){
            const max_token_value = await dbService.findExact("registration_config", "page", data.event);
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

                currentCount = Number(count_token.count);
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
            data.attachment_file = file.originalname
        } 

        data.event_id = generateRecordId(data.event, false);
        const create_result = await dbService.createSafe(table_name, data);
        if(create_result.status){
            // Todo: send email
            if (file) {
                data.attachment_file = file.originalname
            } else{
                
                // Increment the tokenCount here

                if(key && key.length > 0){
                    key[0].tokenCount++; 
                    dbService.update("registration_keys", key[0].id, key[0]);
                }

                await generateQRWithText(data.event, data.event_id);
                // Add Title for email
                data.title = title;
                data.event_date = event_date;
                await event_confirm_registration_email(data);
            }
            
            return res.json({ status: true, message: "Your request has been successfully processed.", create_result });
        }

        return res.json({ status: false, message: create_result.error });

    } catch (error) {
        console.error("Edit error:", error);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

router.get('/registration', async (req, res) => {
  try {
  
    const { filters, data } = await dbService.QuerySqlConverter(req.query, "registration");
    
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

router.get('/registration-csv-data', async (req, res) => {
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

module.exports = router;