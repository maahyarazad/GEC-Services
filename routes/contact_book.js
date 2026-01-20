const express = require("express");
const router = express.Router();
const dbService = require("../services/dbService");

router.post("/api/contacts/create", async (req, res) => {
  try {
    const contactData = req.body;

    const duplicate = await dbService.findByColumn(
      "contact_book",
      "phone",
      contactData.phone
    );

    if (duplicate)
      return res.status(409).json({
        status: "error",
        message: "Contact already exists",
      });

    const result = await dbService.createSafe("contact_book", contactData);

    res
      .status(200)
      .json({ status: result.status, message: "Contact created successfully" });
  } catch (error) {
    console.error("Failed to create contact:", error.message);
    res
      .status(500)
      .json({ status: false, message: "Failed to create contact" });
  }
});

router.delete("/api/contacts", async (req, res) => {
  try {
    const { id } = req.body;

    const result = await dbService.remove("contact_book", id);

    res.status(200).json({
      status: true,
      message: "Contact deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete contact:", error.message);
    res.status(500).json({
      status: false,
      message: "Failed to delete contact",
    });
  }
});

router.put("/api/contacts/modify", async (req, res) => {
  try {
    const contactData = req.body;

    const duplicate = await dbService.findByColumn(
      "contact_book",
      "phone",
      contactData.phone
    );

    if (duplicate && duplicate.id !== contactData.id) {
      return res.status(409).json({
        status: "error",
        message: "Contact with this phone number already exists",
      });
    }

    const result = await dbService.update(
      "contact_book",
      contactData.id,
      contactData
    );
    res.status(200).json({
      status: result.status,
      message: "Contact updated successfully",
    });
  } catch (error) {
    console.error("Failed to update contact:", error.message);
    res.status(500).json({
      status: false,
      message: "Failed to update contact",
    });
  }
});

router.get("/api/contacts", async (req, res) => {
  try {
    const db = dbService.getDB();

    const query = `
      SELECT *
      FROM contact_book
      WHERE phone IS NOT NULL AND blacklist = 0
      GROUP BY phone order by id DESC
    `;

    const result = await new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) {
          console.error("DB error:", err);
          return reject(err);
        }
        resolve(rows);
      });
    });

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

// router.get('/api/contacts', async (req, res) => {
//   try {
//     const db = dbService.getDB();

//     const query = `
//       SELECT COUNT(DISTINCT phone) AS total_contacts
//       FROM contact_book
//     `;

//       res.status(200).json({
//         status: true,
//         contacts: result,
//       });

//   } catch (error) {
//     console.error('Failed to fetch contacts:', error);
//     res.status(500).json({
//       status: false,
//       message: 'Failed to fetch contacts',
//     });
//   }
// });

module.exports = router;
