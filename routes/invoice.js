
const express = require("express");
const router = express.Router();

const fs = require("fs");
const path = require("path");
const authorize_admin = require("../middleware/auth");

const _path = path.join(__dirname, "..", "invoice_json_storage");
    const slugify = (text) =>
        text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");

router.post('/api/invoice-save', authorize_admin, async (req, res) => {
    try {
        
        if (!fs.existsSync(_path)) {
            fs.mkdirSync(_path, { recursive: true });
        }
    
     if (req.body && req.body.data) {
        const { data } = req.body;
        
        // Convert data to JSON string if it's an object
        const jsonData = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

        // Write JSON to file
        fs.writeFileSync(path.join(_path, `${slugify(data.project.project_name)}.json`), jsonData, 'utf8');
        }
        
        return res.json({
            status: true,
            message: "Successfully Saved",
        });
        
        
       

    } catch (error) {
        console.error("Error in /member:", error);
        res.status(500).json({ status: false, message: 'Server error' });
    }
});

router.get('/api/invoice-list', authorize_admin, (req, res) => {
  try {
    if (!fs.existsSync(_path)) {
      return res.json({ status: true, data: [] }); // folder doesn't exist yet
    }

    // Read all files in the directory
    const files = fs.readdirSync(_path).filter(file => file.endsWith('.json'));

    // Read and parse each file
    const invoices = files.map(file => {
      const content = fs.readFileSync(path.join(_path, file), 'utf8');
      try {
        return JSON.parse(content);
      } catch (err) {
        console.warn(`Failed to parse ${file}:`, err);
        return null;
      }
    }).filter(Boolean); // remove any nulls from failed parsing

    return res.json({ status: true, data: invoices });

  } catch (error) {
    console.error("Error in /invoice-list:", error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
});


router.get('/api/invoice-list-delete', authorize_admin, (req, res) => {
  try {
    const { projectName } = req.query;

    if (!projectName) {
      return res.status(400).json({
        status: false,
        message: "Missing required query parameter: projectName",
      });
    }

    const filePath = path.join(_path, `${slugify(projectName)}.json`);

    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath);
      return res.status(200).json({
        status: true,
        message: `Invoice list for project '${projectName}' deleted successfully.`,
        data: [],
      });
    }

    return res.status(404).json({
      status: false,
      message: `Invoice file for project '${projectName}' not found.`,
    });

  } catch (error) {
    console.error("❌ Error in /api/invoice-list-delete:", error);
    res.status(500).json({
      status: false,
      message: "An unexpected server error occurred while deleting the invoice list.",
      error: error.message,
    });
  }
});


module.exports = router;