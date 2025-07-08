const express = require('express');
const router = express.Router();
const { exportTableAsCSV } = require("../services/csvParser");
const dbService = require("../services/dbService");
const multer = require("multer");
const  {generateQRWithText} = require("../services/qrGenerator");
const {comfirm_message_email, event_confirm_registration_email} = require("../services/emailService");

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
        const data = req.body;
        const file = req.file; 

        // Max token doesn't mean anything for sending out documents like applying for Golden Adler Ward 
        if(!file){
            const max_token_value = await dbService.findExact("registration_config", "page", data.event);
            const count_token = await dbService.countExact(table_name, "phone", data.phone);
    
            // Convert to numbers
            const maxTokens = Number(max_token_value?.maxTokensPerGuest);
            const currentCount = Number(count_token.count);
    
            // Validate values
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
                
                await generateQRWithText(data.event, data.event_id);
                await event_confirm_registration_email(req);
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