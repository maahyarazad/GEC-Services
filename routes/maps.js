const express = require('express');
const router = express.Router();
const { generateMapImage } = require('../services/mapService');
const multer = require("multer");
const fs = require("fs").promises;
const path = require("path"); // ✅ required for path.join/parse/extname

// File storage setup (for future use, not needed here since no files uploaded)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "file_storage/");
  },
  filename: async (req, file, cb) => {
    const originalName = path.parse(file.originalname).name;
    const extension = path.extname(file.originalname);
    let newFileName = originalName;
    let counter = 1;
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

const upload = multer({ storage });



router.get("/static-map", (req, res) => {
  res.status(200).send("Static map route is working. Use POST to generate a map.");
});

router.post("/static-map", upload.none(), async (req, res) => {
  try {
    const { placename } = req.body;

    if (!placename) {
      return res.status(400).json({ status: false, message: "placename is required" });
    }

    const imagePath = await generateMapImage(placename);

    return res.status(200).json({
      status: true,
      message: "Map generated successfully",
      imagePath: imagePath.replace(/\\/g, '/'), // normalize path for URLs
      session: req.session,
    });

  } catch (error) {
    console.error('Map generation error:', error);
    return res.status(500).json({ status: false, message: error.message });
  }
});

module.exports = router;
