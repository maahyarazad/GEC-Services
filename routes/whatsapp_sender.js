const express = require("express");
const router = express.Router();
const {
  messageSender,
  fetchContentTemplates,
  handleAutoResponse,
  fetchHistory,
} = require("../services/whatsAppSender");
const crypto = require("crypto");

const dbService = require("../services/dbService");
const db = dbService.getDB();
const fs = require("fs");
const path = require("path");
const { pipeline, Readable } = require("stream");
const { promisify } = require("util");
const streamPipeline = promisify(pipeline);
const fetch = require("node-fetch");
const { getCountCacheKey, countCache } = require("../services/cacheService");
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

    if (!incoming_message?.WaId) {
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
        phoneList: [{ id: "99999", phone: `+${incoming_message.WaId}` }],
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
        if(result.result.status === 401) res.status(401).json({ status: false, ...result.result });
    }
  } catch (error) {
    console.error("Failed to send message", error);
    res
      .status(500)
      .json({ status: false, message: "Failed to fetch WhatsApp templates" });
  }
});

router.get("/api/whatsapp/history/:phone", async (req, res) => {
  try {
    const { phone } = req.params;
    const result = await fetchHistory(phone);

    if (result) {
      res.status(200).json({ status: true, result });
    } else {
      res.status(500).json({ status: false, error: result });
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
    dbService.create("twilio_delivery", {
      response: JSON.stringify(req.body),
    });

    const messageStatus = req.body?.MessageStatus;
    const messageSid = req.body?.MessageSid;

    if (messageStatus && messageStatus === "delivered") {
      const row = db
        .prepare(
          `
                        SELECT contentSid
                        FROM twilio_template_message
                        WHERE messageSid = ?
                    `
        )
        .get(messageSid);

      if (!row?.contentSid) {
        dbService.create("error_log", {
          error: "CRITICAL ERROR - Cannot fetch the contentSid for auto check",
          origin_function: "sendMessageToPhone",
        });
        return;
      }

      const phone = req.body?.To.replace(/^whatsapp:/, "");

      dbService.updateWhere(
        "contact_book",
        { contentSid: row.contentSid },
        { phone: phone }
      );
    }
  } catch (error) {
    console.error("Twilio callback error:", error);
    res.sendStatus(200); // still 2xx
  }
});

router.get("/api/whatsapp/twilio-delivery-logs", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 25) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 25) || 25, 1),
      100
    );
    const offset = (page - 1) * limit;

    const now = new Date();
    const defaultStart = new Date();
    defaultStart.setDate(now.getDate() - 2);

    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : defaultStart;

    const endDate = req.query.endDate ? new Date(req.query.endDate) : now;

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        status: false,
        message: "Invalid startDate or endDate",
      });
    }

    const endDateInclusive = new Date(endDate);
    endDateInclusive.setHours(23, 59, 59, 999);

    const templates = await fetchContentTemplates();
    const templateMap = new Map();

    templates.result.forEach((t) => {
      templateMap.set(t.sid, t.friendlyName);
    });

    const start = startDate.toISOString();
    const end = endDateInclusive.toISOString();

    const baseCte = `
      WITH ranked AS (
        SELECT 
          td.id,
          td.metadata_createdAt,
          ttm.contentSid,
          json_extract(td.response, '$.SmsStatus') AS SmsStatus,
          ttm.messageSid,
          (cb.first_name || ' ' || cb.last_name) AS full_name,
          cb.phone,
          ROW_NUMBER() OVER (
            PARTITION BY td.id
            ORDER BY td.metadata_createdAt DESC
          ) AS rn
        FROM twilio_delivery td
        LEFT JOIN twilio_template_message ttm
          ON json_extract(td.response, '$.MessageSid') = ttm.messageSid
        LEFT JOIN contact_book cb
          ON json_extract(td.response, '$.To') = 'whatsapp:' || cb.phone
        WHERE ttm.messageSid IS NOT NULL
          AND td.metadata_createdAt >= ?
          AND td.metadata_createdAt <= ?
      )
    `;

    const dataQuery = `
      ${baseCte}
      SELECT *
      FROM ranked
      WHERE rn = 1
      ORDER BY metadata_createdAt DESC
      LIMIT ? OFFSET ?;
    `;

    const countQuery = `
      ${baseCte}
      SELECT COUNT(*) AS totalCount
      FROM ranked
      WHERE rn = 1;
    `;

    const dataStmt = db.prepare(dataQuery);
    const rows = dataStmt.all(start, end, limit, offset);

    const cacheKey = getCountCacheKey(start, end);

    let totalCount;
    const cachedCount = countCache.get(cacheKey);

    if (cachedCount !== undefined) {
      totalCount = cachedCount;
    } else {
      const countStmt = db.prepare(countQuery);
      const countRow = countStmt.get(start, end);
      totalCount = countRow?.totalCount || 0;
      countCache.set(cacheKey, totalCount);
    }

    const result = rows.map((row) => ({
      ...row,
      templateFriendlyName: templateMap.get(row.contentSid) ?? null,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return res.json({
      status: true,
      result,
      filters: {
        startDate: start,
        endDate: end,
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        currentCount: result.length,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error in /api/whatsapp/twilio-delivery-logs:", error);
    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
});

router.get("/api/whatsapp/twilio-response-logs", async (req, res) => {
  try {
    const query = `
WITH ranked AS (
  SELECT 
    tr.id,
    tr.received_at,
    (cb.first_name || ' ' || cb.last_name) AS full_name,  
    	cb.type,
    json_extract(tr.payload, '$.WaId') AS WaId,
    json_extract(tr.payload, '$.ProfileName') AS ProfileName,
    json_extract(tr.payload, '$.MessageType') AS MessageType,
    json_extract(tr.payload, '$.Body') AS Body,
    tr.payload,
    ROW_NUMBER() OVER (
      PARTITION BY tr.id
      ORDER BY tr.received_at DESC
    ) AS rn
  FROM twilio_responses tr
  LEFT JOIN contact_book cb
    ON cb.phone = '+' || json_extract(tr.payload, '$.WaId')
)
SELECT *
FROM ranked where rn = 1
ORDER BY id DESC;


            `;

    const stmt = db.prepare(query);
    const _result = stmt.all();

    return res.json({
      status: true,
      data: _result,
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
      const eventId = req.query.eventId ?? undefined;
      const { From, Body, ButtonPayload, ButtonText } = req.body;
      const response = new MessagingResponse();
      response.message("");

      res.writeHead(200, { "Content-Type": "text/xml" });
      res.end(response.toString());

      await handleAutoResponse(From, ButtonPayload, eventId);

      // Fire and forget: save raw payload + log message to DB
      dbService.create("twilio_responses", {
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
    const { startDate, endDate } = req.query;
    const templates = await fetchContentTemplates();
    const templateMap = new Map();

    templates.result.forEach((t) => {
      templateMap.set(t.sid, t.friendlyName);
    });

    const start = new Date(startDate).toISOString().slice(0, 10);
    const end = new Date(endDate).toISOString().slice(0, 10);

    const deliveryQuery = `

    SELECT
    'undelivered' AS type,
            ttm.contentSid,
            COUNT(json_extract(td.response, '$.To')) AS to_number
        FROM twilio_delivery td
        LEFT JOIN twilio_template_message ttm
            ON json_extract(td.response, '$.SmsSid') = ttm.messageSid
        WHERE json_extract(td.response, '$.MessageStatus') = 'undelivered'
        AND td.metadata_createdAt BETWEEN ? AND ? GROUP BY ttm.contentSid

      UNION ALL

   SELECT
    'delivered' AS type,
	ttm.contentSid,
            COUNT(json_extract(td.response, '$.To')) AS to_number
        FROM twilio_delivery td
        LEFT JOIN twilio_template_message ttm
            ON json_extract(td.response, '$.SmsSid') = ttm.messageSid
        WHERE json_extract(td.response, '$.MessageStatus') = 'delivered'
        AND td.metadata_createdAt BETWEEN ? AND ? GROUP BY ttm.contentSid


    UNION ALL

   SELECT
    'read' AS type,
        ttm.contentSid,
        COUNT(json_extract(td.response, '$.To')) AS to_number
            FROM twilio_delivery td
            LEFT JOIN twilio_template_message ttm
                ON json_extract(td.response, '$.SmsSid') = ttm.messageSid
            WHERE json_extract(td.response, '$.MessageStatus') = 'read'
            AND td.metadata_createdAt BETWEEN ? AND ? GROUP BY ttm.contentSid
  `;

    const responseQuery = `
        SELECT 'notAttend' AS type, COUNT(*) AS to_number
        FROM twilio_responses as tr
        WHERE (json_extract(payload, '$.ButtonPayload') = ? 
                OR json_extract(payload, '$.ButtonPayload') = ?)
            AND tr.received_at BETWEEN ? AND ? 
        UNION ALL
        SELECT 'attend' AS type, COUNT(*) AS to_number
        FROM twilio_responses as tr
        WHERE (json_extract(payload, '$.ButtonPayload') = ? 
                OR json_extract(payload, '$.ButtonPayload') = ?)
            AND tr.received_at BETWEEN ? AND ? 
        `;

    const stmt = db.prepare(deliveryQuery);
    const rows = stmt.all(
      start,
      end, // undelivered
      start,
      end, // delivered
      start,
      end // read
    );

    const delivery_result = rows.map((e) => ({
      ...e,
      templateName: templateMap.get(e.contentSid) || null,
    }));

    const _stmt = db.prepare(responseQuery);
    const _rows = _stmt.all(
      "NOT_ATTEND",
      "NOT_INTERESTED",
      start,
      end,
      "ATTEND",
      "INTERESTED",
      start,
      end
    );

    const response_result = {};
    _rows.forEach(({ type, to_number }) => {
      response_result[type] = to_number ?? 0;
    });

    return res
      .status(200)
      .json({ status: true, data: { response_result, delivery_result } });
  } catch (err) {
    console.error("Failed to fetch insights", err);
    return res.status(500).json({ status: false, message: "Server error" });
  }
});

router.get("/api/whatsapp/attendance-insight-by-type", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = new Date(startDate).toISOString().slice(0, 10);
    const end = new Date(endDate).toISOString().slice(0, 10);

    const attendanceInsightByTypeQuery = `

WITH responses AS (
  SELECT 
    '+' || json_extract(tr.payload, '$.WaId') AS phone,
    CASE 
      WHEN json_extract(tr.payload, '$.ButtonPayload') IN ('ATTEND', 'INTERESTED') THEN 'attend'
      WHEN json_extract(tr.payload, '$.ButtonPayload') IN ('NOT_ATTEND', 'NOT_INTERESTED') THEN 'notAttend'
    END AS status
  FROM twilio_responses AS tr
  WHERE json_extract(tr.payload, '$.ButtonPayload') IN (
    'ATTEND', 'INTERESTED', 'NOT_ATTEND', 'NOT_INTERESTED'
  )
  AND tr.received_at BETWEEN ? AND ?
)
SELECT 
  COALESCE(cb.type, 'unknown') AS type,
  r.status,
  COUNT(*) AS responses
FROM responses r
LEFT JOIN contact_book cb 
  ON r.phone = cb.phone
GROUP BY cb.type, r.status
ORDER BY responses DESC;
  `;

    const stmt = db.prepare(attendanceInsightByTypeQuery);
    const attendance_result = stmt.all(start, end);

    return res.status(200).json({ status: true, data: { attendance_result } });
  } catch (err) {
    console.error("Failed to fetch insights", err);
    return res.status(500).json({ status: false, message: "Server error" });
  }
});
router.get("/api/whatsapp/insight-by-type", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = new Date(startDate).toISOString().slice(0, 10);
    const end = new Date(endDate).toISOString().slice(0, 10);

    const deliveryInsightByTypeQuery = `

 WITH messages AS (
    SELECT
        replace(json_extract(td.response, '$.To'), 'whatsapp:', '') AS to_number,
        json_extract(td.response, '$.MessageStatus') AS status
    FROM twilio_delivery td
    LEFT JOIN twilio_template_message ttm
        ON json_extract(td.response, '$.SmsSid') = ttm.messageSid
    WHERE json_extract(td.response, '$.MessageStatus') IN ('delivered', 'undelivered', 'read')
    AND td.metadata_createdAt BETWEEN ? AND ?
)
SELECT 
    COALESCE(cb.type, 'unknown') AS type,
    SUM(CASE WHEN dm.status = 'delivered'   THEN 1 ELSE 0 END) AS delivered_count,
    SUM(CASE WHEN dm.status = 'undelivered' THEN 1 ELSE 0 END) AS undelivered_count,
    SUM(CASE WHEN dm.status = 'read'        THEN 1 ELSE 0 END) AS read_count,
    COUNT(*) AS total_count
FROM messages dm
LEFT JOIN contact_book cb 
    ON dm.to_number = cb.phone
GROUP BY cb.type
ORDER BY total_count DESC;

  `;

    const stmt = db.prepare(deliveryInsightByTypeQuery);
    const delivery_result = stmt.all(start, end);

    return res.status(200).json({ status: true, data: { delivery_result } });
  } catch (err) {
    console.error("Failed to fetch insights", err);
    return res.status(500).json({ status: false, message: "Server error" });
  }
});

router.get("/api/whatsapp/download-media", async (req, res) => {
  try {
    const { mediaUrl, filename } = req.query;

    if (!mediaUrl) {
      return res.status(400).json({
        status: false,
        message: "mediaUrl is required",
      });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    const authHeader =
      "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const response = await fetch(mediaUrl, {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch media: ${response.statusText}`);
    }

    const finalName = filename || `twilio_audio_${Date.now()}.ogg`;
    const uploadDir = path.join(__dirname, "..", "twilio_media");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, finalName);

    // Convert web ReadableStream to Node.js stream and pipe to file
    const nodeStream = Readable.from(response.body);
    await streamPipeline(nodeStream, fs.createWriteStream(filePath));

    // Send the file for download to the client
    return res.download(filePath);
  } catch (error) {
    console.error("Media download error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to download media",
    });
  }
});

router.patch("/api/whatsapp/update-map-url", async (req, res) => {
  try {
    const { google_map_url } = req.query;

    if (!google_map_url) {
      return res.status(400).json({
        status: false,
        message: "google_map_url is required",
      });
    }

    const filePath = path.resolve(__dirname, "..","data", "google_data.json");

    // Read existing file
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const jsonData = JSON.parse(fileContent);

    // Update the value
    jsonData.google_map_url = google_map_url;

    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), "utf-8");

    return res.status(200).json({
      status: true,
      message: "Map URL updated successfully",
      data: jsonData,
    });

  } catch (error) {
    console.error("Update map URL error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to update map URL",
    });
  }
});


router.get("/api/whatsapp/get-map-url", async (req, res) => {
  try {
    const filePath = path.resolve(__dirname, "..", "data", "google_data.json");

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const jsonData = JSON.parse(fileContent);

    return res.status(200).json({
      status: true,
      data: jsonData,
    });

  } catch (error) {
    console.error("Get map URL error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to get map URL",
    });
  }
});

module.exports = router;
