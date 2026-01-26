const express = require("express");
const router = express.Router();
const {
  messageSender,
  fetchContentTemplates,
  handleAutoResponse,
  flattenObject,
  normalizeRow,
} = require("../services/whatsAppSender");
const crypto = require("crypto");

const dbService = require("../services/dbService");
const db = dbService.getDB();

const MessagingResponse = require("twilio").twiml.MessagingResponse;

router.post("/api/whatsapp/send", (req, res) => {
  // Fire and forget: run messageSender but don't await
  messageSender(req).catch((error) => {
    console.error("Background messageSender error:", error);
  });

  // Respond immediately
  res.status(200).json({
    status: true,
    message: "Your request is being processed. Check the logs for progress.",
  });
});

router.post("/api/whatsapp/quick-reply", async (req, res) => {
  try {
    const { message, incoming_message } = req.body;
    const templates = await fetchContentTemplates();
    const simple_response = templates.result.find(
      (x) => x.sid === "HXb1ce9479f3d42819bef456f00448afcc"
    );

    if (!message?.trim()) {
      return res.status(400).json({
        status: false,
        message: "Message cannot be empty",
      });
    }

    if (!incoming_message?.payload_WaId) {
      return res.status(400).json({
        status: false,
        message: "Invalid incoming WhatsApp message",
      });
    }

    if (!simple_response) {
      return res.status(500).json({
        status: false,
        message: "WhatsApp template not found",
      });
    }

    const _req = {
      body: {
        phoneList: [
          { id: "99999", phone: `+${incoming_message.payload_WaId}` },
        ],
        template: simple_response,
        payload: { 1: message },
      },
    };
    const result = await messageSender(_req);
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
    const { filters, jsonFilters, data } = await dbService.QuerySqlConverter(req.query, table_name);

    const flatData = data.map(normalizeRow);

    const total = await dbService.getTotalCount(
      table_name,
      filters,
      jsonFilters
    );

    return res.json({
      status: true,
      data: flatData,
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

router.get("/api/whatsapp/insight", async (req, res) => {
  try {
    const deliveryCountQuery = `
                            SELECT 
                                COUNT(DISTINCT json_extract(td.response, '$.To')) AS to_number
                            FROM twilio_delivery td
                            LEFT JOIN twilio_template_message ttm
                                ON json_extract(td.response, '$.MessageSid') = ttm.messageSid
                            WHERE json_extract(td.response, '$.MessageStatus') = ?
                                AND ttm.contentSid = ?
                            `;

    const buttonCountQuery = `
                        SELECT COUNT(*) AS to_number
                        FROM twilio_responses
                        WHERE json_extract(payload, '$.ButtonPayload') = ?
                        `;

    const contentSid = "HX01112eac1bf320e6213b4e2ff6ff060f";
    const simpleMessageContentSid = "HXb1ce9479f3d42819bef456f00448afcc";

    
    const runQuery = (db, query, params = []) =>
        new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) {
                    console.error("DB error:", err);
                    return reject(err);
                }
                resolve(rows);
            });
        });
        
        const [undelivered, delivered, read, simpleMessageDelivered, simpleMessageUndelivered ,notAttend, attend] = await Promise.all(
          [
            runQuery(db, deliveryCountQuery, ["undelivered", contentSid]),
            runQuery(db, deliveryCountQuery, ["delivered", contentSid]),
            runQuery(db, deliveryCountQuery, ["read", contentSid]),
            runQuery(db, deliveryCountQuery, ["delivered", simpleMessageContentSid]),
            runQuery(db, deliveryCountQuery, ["undelivered", simpleMessageContentSid]),
            runQuery(db, buttonCountQuery, ["NOT_ATTEND"]),
            runQuery(db, buttonCountQuery, ["ATTEND"]),
          ]
        );
        
    const stats = {
      undelivered: undelivered[0]?.to_number ?? 0,
      delivered: delivered[0]?.to_number ?? 0,
      read: read[0]?.to_number ?? 0,
      simpleMessageDelivered: simpleMessageDelivered[0]?.to_number ?? 0,
      simpleMessageUndelivered: simpleMessageUndelivered[0]?.to_number ?? 0,
      attend: attend[0]?.to_number ?? 0,
      notAttend: notAttend[0]?.to_number ?? 0,
    };

    return  res
      .status(200)
      .json({ status: true, data:stats });

  } catch (err) {
    console.error("Failed to fetch insights", err);
    
    res.status(500).json({ status: false, message: "Server error" });
  }
});

module.exports = router;
