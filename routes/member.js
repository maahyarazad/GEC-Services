const express = require('express');
const router = express.Router();
const { exportTableAsCSV } = require("../services/csvParser");
const dbService = require("../services/dbService");
const multer = require("multer");
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

router.get('/member-csv-data', async (req, res) => {
  try {
    const data = await dbService.findAll("member");

    const csv = await exportTableAsCSV(data); // Await CSV generation

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=member-data-${Date.now()}.csv`
    );

    res.send(csv); // Send the actual CSV string
    
  } catch (error) {
    console.error("Error in fetching data from member table:", error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
});


router.get('/member', async (req, res) => {
  try {
  
    const { filters, data } = await dbService.QuerySqlConverter(req.query, "member");
    
    const total = await dbService.getTotalCount("member", filters);

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


router.post("/member", upload.single('attachment_file'), async (req, res) => {
    try {
        const table_name = "member";
        const data = req.body;
        const file = req.file; 

        // You can check if file was sent
        if (file) {
            data.attachment_file = file.originalname
        } 

        const create_result = await dbService.createSafe(table_name, data);

        if(create_result.status){
            // Todo: send email
            // await generateQRWithText(request, path);
            // await forumRegisterSendEmail({ reqBody: request });
            return res.json({ status: true, message: "Your request has been successfully processed.", create_result });
        }

        return res.json({ status: false, message: create_result.error });

    } catch (error) {
        console.error("Edit error:", error);
        res.status(500).json({ status: false, message: "Server error" });
    }
});


module.exports = router;