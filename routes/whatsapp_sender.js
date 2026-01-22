const express = require("express");
const router = express.Router();
const { messageSender, fetchContentTemplates, handleAutoResponse } = require("../services/whatsAppSender");
const crypto = require("crypto");

const dbService = require("../services/dbService");
const db = dbService.getDB();

const MessagingResponse = require("twilio").twiml.MessagingResponse;

router.post("/api/whatsapp/send", async (req, res) => {
  try {
    const result = await messageSender(req);

    res
      .status(200)
      .json({ status: result.status, message: "Message sent successfully" });
  } catch (error) {
    console.error("Failed to send message", error.message);
    res
      .status(500)
      .json({ status: false, message: "Failed to send the message" });
  }
});

router.get("/api/whatsapp/list", async (req, res) => {
  try {
    const result = await fetchContentTemplates(req, res);
    if (result.status) {
      res.status(200).json({ status: true, templates: result.result });
    } else {
      res.status(500).json({ status: false, error: result.result });
    }
  } catch (error) {
    console.error("Failed to send message", error);
    res
      .status(500)
      .json({ status: false, message: "Failed to fetch WhatsApp templates" });
  }
});

router.post("/whatsapp/twilio-callback", (req, res) => {
  try {
    res.sendStatus(202);

    dbService
      .createSafe("twilio_delivery", { response: JSON.stringify(req.body) })
      .catch((err) => {
        console.error("Failed to store Twilio callback:", err);
      });
  } catch (error) {
    console.error("Twilio callback error:", error);
    res.sendStatus(200); // still 2xx
  }
});

router.get("/api/whatsapp/twilio-delivery-logs", async (req, res) => {
  try {
    const templates = await fetchContentTemplates();
    const templateMap = new Map();

    templates.result.forEach((t) => {
      templateMap.set(t.sid, t.friendlyName);
    });

    const query = `
                   SELECT td.response, td.metadata_createdAt, ttm.contentSid, ttm.messageSid, cb.first_name, cb.last_name, cb.phone
                    FROM twilio_delivery td
                    LEFT JOIN twilio_template_message ttm
                        ON json_extract(td.response, '$.MessageSid') = ttm.messageSid
                    LEFT JOIN contact_book cb
                        ON json_extract(td.response, '$.To') = 'whatsapp:' || cb.phone
                    WHERE ttm.messageSid IS NOT NULL ORDER BY td.metadata_createdAt DESC;
                    
            `;

    const _result = await new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) {
          console.error("DB error:", err);
          return reject(err);
        }
        resolve(rows);
      });
    });

    const result = _result.map((row) => ({
      id: crypto.randomUUID(),
      ...row,
      templateFriendlyName: templateMap.get(row.contentSid) ?? null,
    }));

    return res.json({
      status: true,
      result,
    });
  } catch (error) {
    console.error("Error in /member:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

router.get("/api/whatsapp/twilio-response-logs", async (req, res) => {
  try {
    const table_name = "twilio_responses";
    const { filters, data } = await dbService.QuerySqlConverter(
      req.query,
      table_name
    );

    const total = await dbService.getTotalCount(table_name, filters);

    return res.json({
      status: true,
      data,
      total,
    });
  } catch (error) {
    console.error("Error in /member:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

router.post(
  "/webhooks/whatsapp",
  express.urlencoded({ extended: false }),
  async (req, res) => {
    try {
         const response = new MessagingResponse();
        response.message("");

        res.writeHead(200, { "Content-Type": "text/xml" });
        res.end(response.toString());
      const { From, Body, ButtonPayload, ButtonText } = req.body;

      

      await handleAutoResponse(From, ButtonPayload);

      // Fire and forget: save raw payload + log message to DB
      await dbService.createSafe("twilio_responses", {
        source: "twilio",
        event_type: "whatsapp.message.received",
        payload: JSON.stringify(req.body),
      });
      
    } catch (err) {
      console.error("Failed to store Twilio callback:", err);
    }
  }
);

module.exports = router;

