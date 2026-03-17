const express = require("express");
const router = express.Router();
const dbService = require("../services/dbService");
const db = dbService.getDB();
const {corruptedContactBookData} = require("../services/whatsAppSender");

router.post("/api/contacts/create", (req, res) => {
  try {
    const contactData = req.body;

    // Check if phone already exists (returns array)
    const duplicates = dbService.findByColumn("contact_book", "phone", contactData.phone);

    if (duplicates.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "Contact already exists",
      });
    }

    const result = dbService.create("contact_book", contactData);

    res.status(200).json({
      status: true,
      message: "Contact created successfully",
      id: result.id,
    });
  } catch (error) {
    console.error("Failed to create contact:", error.message);
    res.status(500).json({ status: false, message: "Failed to create contact" });
  }
});

router.delete("/api/contacts", (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ status: false, message: "ID is required" });
    }

    const result = dbService.remove("contact_book", id);

    if (result.changes === 0) {
      return res.status(404).json({ status: false, message: "Contact not found" });
    }

    res.status(200).json({
      status: true,
      message: "Contact deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete contact:", error.message);
    res.status(500).json({ status: false, message: "Failed to delete contact" });
  }
});

router.put("/api/contacts/modify", (req, res) => {
  try {
    const contactData = req.body;
    if (!contactData.id) {
      return res.status(400).json({ status: false, message: "ID is required" });
    }

    // Check for duplicates excluding current contact id
    const duplicates = dbService.findByColumn("contact_book", "phone", contactData.phone);
    const duplicateExists = duplicates.some(d => d.id !== contactData.id);

    if (duplicateExists) {
      return res.status(409).json({
        status: "error",
        message: "Contact with this phone number already exists",
      });
    }

    const result = dbService.update("contact_book", contactData.id, contactData);

    if (result.changes === 0) {
      return res.status(404).json({ status: false, message: "Contact not found" });
    }

    res.status(200).json({
      status: true,
      message: "Contact updated successfully",
    });
  } catch (error) {
    console.error("Failed to update contact:", error.message);
    res.status(500).json({ status: false, message: "Failed to update contact" });
  }
});

router.get("/api/contacts", (req, res) => {
  try {
    const blacklistFilter = req.query.blacklist;
    // Convert query param to integer, default to 0 if undefined
    const blacklist = blacklistFilter === undefined ? 0 : (blacklistFilter === '1' || blacklistFilter === 'true' ? 1 : 0);

    // Use parameterized query to avoid injection
    const query = `
      SELECT *
      FROM contact_book
      WHERE phone IS NOT NULL AND blacklist = ? 
      ORDER BY id DESC
    `;

    const stmt = db.prepare(query);
    const result = stmt.all(blacklist);

    res.status(200).json({
      status: true,
      data: result,
    });
  } catch (error) {
    console.error("Failed to fetch contacts:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch contacts",
    });
  }
});


router.get("/api/contacts/corrupted-contact-book", async (req, res) => {
  try {
    const result = corruptedContactBookData();
    res.status(200).json({ status: true, data: result });
    
  } catch (error) {
    console.error("Failed to fetch data", error);
    res
      .status(500)
      .json({ status: false, message: "Failed to fetch data" });
  }
});

router.get("/api/contacts/clear-contact-book", async (req, res) => {
  try {
    const query = `
      UPDATE contact_book SET contentSid = NULL
    `;

    const stmt = db.prepare(query);
    const result = stmt.run(); 

    res.status(200).json({
      status: true,
      message: "Contact book cleared successfully",
      changes: result.changes, 
    });
  } catch (error) {
    console.error("Failed to clear contact book:", error);
    res.status(500).json({
      status: false,
      message: "Failed to clear contact book",
    });
  }
});



module.exports = router;
