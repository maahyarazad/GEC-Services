const express = require("express");
const router = express.Router();
const dbService = require("../services/dbService");
const db = dbService.getDB();
const { corruptedContactBookData } = require("../services/whatsAppSender");

router.post("/api/contacts/create", (req, res) => {
  try {
    const contactData = req.body;

    // Check if phone already exists (returns array)
    const duplicates = dbService.findByColumn(
      "contact_book",
      "phone",
      contactData.phone
    );

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
    res
      .status(500)
      .json({ status: false, message: "Failed to create contact" });
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
      return res
        .status(404)
        .json({ status: false, message: "Contact not found" });
    }

    res.status(200).json({
      status: true,
      message: "Contact deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete contact:", error.message);
    res
      .status(500)
      .json({ status: false, message: "Failed to delete contact" });
  }
});

router.put("/api/contacts/modify", (req, res) => {
  try {
    const contactData = req.body;
    if (!contactData.id) {
      return res.status(400).json({ status: false, message: "ID is required" });
    }

    // Check for duplicates excluding current contact id
    const duplicates = dbService.findByColumn(
      "contact_book",
      "phone",
      contactData.phone
    );
    const duplicateExists = duplicates.some((d) => d.id !== contactData.id);

    if (duplicateExists) {
      return res.status(409).json({
        status: "error",
        message: "Contact with this phone number already exists",
      });
    }

    const result = dbService.update(
      "contact_book",
      contactData.id,
      contactData
    );

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ status: false, message: "Contact not found" });
    }

    res.status(200).json({
      status: true,
      message: "Contact updated successfully",
    });
  } catch (error) {
    console.error("Failed to update contact:", error.message);
    res
      .status(500)
      .json({ status: false, message: "Failed to update contact" });
  }
});

router.get("/api/contacts", (req, res) => {
  try {
    const { blacklist, corrupted, guest_list } = req.query;

    // Handle corrupted contacts - delegate to existing function
    if (corrupted === "1") {
      const result = corruptedContactBookData();
      return res.status(200).json({ status: true, data: result });
    }
    // Type ordering shared across queries
    const TYPE_ORDER_SQL = `
  CASE type
    WHEN 'gec_staff'       THEN 1
    WHEN 'club_partner'    THEN 2
    WHEN 'club_member'     THEN 3
    WHEN 'difa'            THEN 4
    WHEN 'expert'          THEN 5
    WHEN 'expert_guest'    THEN 6
    WHEN 'only_guest'      THEN 7
    WHEN 'medical_society' THEN 8
    ELSE                        9
  END
`;

    // Handle guest list
    if (guest_list === "1") {
      const { event_id } = req.query;

      if (!event_id) {
        return res
          .status(400)
          .json({ status: false, error: "event_id is required" });
      }

        const query = `
        SELECT cb.*, egl.complete_attendance
        FROM contact_book cb
        INNER JOIN (
            SELECT *, ROW_NUMBER() OVER (PARTITION BY contact_book_id ORDER BY id) AS rn
            FROM event_guest_list
            WHERE event_id = ?
        ) egl ON egl.contact_book_id = cb.id
        WHERE egl.rn = 1
        ORDER BY ${TYPE_ORDER_SQL}
        `;

      const result = db.prepare(query).all(event_id);
      return res.status(200).json({ status: true, data: result });
    }

    // Handle default + blacklist
    const blacklistValue = blacklist === "1" || blacklist === "true" ? 1 : 0;

    const query = `
        SELECT *
        FROM contact_book
        WHERE phone IS NOT NULL AND blacklist = ?
        ORDER BY ${TYPE_ORDER_SQL}
        `;

    const result = db.prepare(query).all(blacklistValue);

    return res.status(200).json({ status: true, data: result });
  } catch (error) {
    console.error("Failed to fetch contacts:", error);
    res
      .status(500)
      .json({ status: false, message: "Failed to fetch contacts" });
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

router.get("/api/contacts/add-to-guest-list", async (req, res) => {
  try {
    const { contactId, eventId } = req.query;

    const duplicateQuery = ` SELECT EXISTS (
    SELECT 1
    FROM event_guest_list
    WHERE contact_book_id = ?
      AND event_id = ?
) AS exists_flag;
        
      `;
    const stmt = db.prepare(duplicateQuery);
    const duplicateCheck = await stmt.get(contactId, eventId);

    if (duplicateCheck.exists_flag === 1) {
      return res.status(404).json({
        status: false,
      });
    }

    const result = dbService.create("event_guest_list", {
      contact_book_id: Number(contactId),
      event_id: Number(eventId),
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

router.patch("/api/contacts/complete-attendance", async (req, res) => {
  try {
    const { contactId, eventId } = req.query;

    if (!contactId || !eventId) {
      return res.status(400).json({
        status: false,
        message: "contactId and eventId are required",
      });
    }

    const completeAttendanceQuery = `
        UPDATE event_guest_list 
        SET complete_attendance = 1
        WHERE contact_book_id = ?
        AND event_id = ?
    `;

    const stmt = db.prepare(completeAttendanceQuery);
    const result = stmt.run(contactId, eventId);

    if (result.changes === 0) {
      return res.status(404).json({
        status: false,
        message: "No matching guest found",
      });
    }

    res.status(200).json({
      status: true,
      message: "Attendance marked complete",
    });
  } catch (error) {
    console.error("Failed to update attendance:", error);
    res.status(500).json({
      status: false,
      message: "Failed to update attendance",
    });
  }
});

router.delete("/api/contacts/remove-guest", (req, res) => {
  try {
    const { contactId, eventId } = req.query;

    if (!contactId || !eventId) {
      return res.status(400).json({
        status: false,
        message: "contactId and eventId are required",
      });
    }

    const completeAttendanceQuery = `
        DELETE FROM event_guest_list 
        WHERE contact_book_id = ? AND event_id = ?
        
    `;

    const stmt = db.prepare(completeAttendanceQuery);
    const result = stmt.run(contactId, eventId);

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ status: false, message: "Guest not found" });
    }

    res.status(200).json({
      status: true,
      message: "Guest deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete guest:", error.message);
    res.status(500).json({ status: false, message: "Failed to remove guest" });
  }
});

module.exports = router;
