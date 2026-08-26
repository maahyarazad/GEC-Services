const express = require("express");
const router = express.Router();
const {
  messageSender,
  fetchContentTemplates,
  deleteContentTemplate,
  handleAutoResponse,
  fetchHistory,
} = require("../services/whatsAppSender");
const { matchOptOutKeyword, recordOptOut, listOptOuts } = require("../services/optOutService");


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
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

const UAE_TZ = "Asia/Dubai";

// Helper: parse any date string → UAE dayjs object
const toUAE = (dateStr) => {
  if (!dateStr) return null;

  return dayjs.utc(dateStr).tz(UAE_TZ).format("YYYY-MM-DD HH:mm:ss");;
};

/**
 * The web client's IANA zone, taken from ?tz= (or the x-timezone header) and
 * validated by handing it to dayjs — an unknown zone throws there, and an
 * unvalidated string would poison every subsequent conversion in the request.
 * Falls back to UAE so existing callers that send nothing keep their behaviour.
 */
const resolveClientTimeZone = (req) => {
  const requested = req.query?.tz || req.get?.("x-timezone");
  if (!requested || typeof requested !== "string") return UAE_TZ;
  try {
    dayjs.utc().tz(requested);
    return requested;
  } catch {
    return UAE_TZ;
  }
};

// UTC timestamp string → the client's local wall clock.
const toClientZone = (dateStr, tz) =>
  dateStr ? dayjs.utc(dateStr).tz(tz).format("YYYY-MM-DD HH:mm:ss") : null;

// A local wall-clock string → the UTC form stored in the DB column.
const clientZoneToUtc = (dateStr, tz) =>
  dayjs.tz(dateStr, tz).utc().format("YYYY-MM-DD HH:mm:ss");

// ─── Twilio template deletion helpers ────────────────────────────────────────

// Twilio content SIDs are "HX" followed by 32 hex characters. Anything else is
// rejected before it reaches a query or the Twilio API.
const isValidContentSid = (value) =>
  typeof value === "string" && /^HX[0-9a-fA-F]{32}$/.test(value);

/**
 * Number of messages ever sent from a template.
 *
 * This is THE gate for deletion. twilio_template_message is joined by the
 * delivery logs, response logs and insight endpoints to resolve a template's
 * friendly name; deleting a template that has rows here would leave every one
 * of those historical rows with an unresolvable name, permanently.
 *
 * Errors are deliberately NOT caught. A caller that swallowed the failure
 * would read it as "no sends" and delete a template it should not have — the
 * gate has to fail closed, so the throw must reach the handler.
 */
const countTemplateSends = (contentSid) =>
  db
    .prepare("SELECT COUNT(*) AS c FROM twilio_template_message WHERE contentSid = ?")
    .get(contentSid).c;

// Advisory only. contact_book and contact_book_events also carry a contentSid,
// but they track the auto-response/attendance flow rather than broadcast
// history, and the spec scopes the gate to twilio_template_message alone.
// Reported so the UI can warn and so the gate can be widened later without an
// API change. See research.md R3.
const countRelatedReferences = (contentSid) => ({
  contactBook: db
    .prepare("SELECT COUNT(*) AS c FROM contact_book WHERE contentSid = ?")
    .get(contentSid).c,
  contactBookEvents: db
    .prepare("SELECT COUNT(*) AS c FROM contact_book_events WHERE contentSid = ?")
    .get(contentSid).c,
});

// Matches the identity resolution used by routes/twilio_credentials.js so the
// audit lines read consistently in the dashboard's Server Logs section.
const adminIdentity = (req) =>
  req.user?.username || req.user?.email || req.user?.role || "unknown-admin";


router.post("/api/whatsapp/send", (req, res) => {
  // Fire and forget: run messageSender but don't await. The response below is
  // already sent before this resolves, so opted-out skips (FR-008) surface
  // via the logs it points to, rather than in the HTTP response itself —
  // messageSender() already writes a skip summary to error_log when non-empty.
  messageSender(req)
    .then((result) => {
      if (result?.skippedOptOut?.length) {
        console.log(
          `${Date.now()} - messageSender skipped ${result.skippedOptOut.length} opted-out number(s):`,
          result.skippedOptOut
        );
      }
    })
    .catch((error) => {
      console.error(`${Date.now()} - Background messageSender error:`, error);
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
    console.error(`${Date.now()} - Failed to send message`, error.message);
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
      if (result.result.status === 401)
        res.status(401).json({ status: false, ...result.result });
    }
  } catch (error) {
    console.error(`${Date.now()} - Failed to send message`, error);
    res
      .status(500)
      .json({ status: false, message: "Failed to fetch WhatsApp templates" });
  }
});

router.post("/api/twilio/create-template", async (req, res) => {
  try {
    const { friendly_name, language, body, variable_examples, buttons, type, media } = req.body;

    if (!friendly_name || !language || !body) {
      return res.status(400).json({ status: false, message: "friendly_name, language, and body are required" });
    }

    const SUPPORTED_TYPES = ["twilio/quick-reply", "twilio/text", "twilio/media"];
    const templateType = type || "twilio/quick-reply";
    if (!SUPPORTED_TYPES.includes(templateType)) {
      return res.status(400).json({ status: false, message: `Unsupported template type: ${templateType}` });
    }

    // Normalize media into an array of non-empty URL / {{variable}} strings.
    const mediaList = (Array.isArray(media) ? media : media ? [media] : [])
      .map((m) => (typeof m === "string" ? m.trim() : ""))
      .filter(Boolean);

    // Validate the payload before sending it to Twilio.
    if (templateType === "twilio/media") {
      if (mediaList.length === 0) {
        return res.status(400).json({ status: false, message: "A media URL is required for twilio/media templates" });
      }
      const mediaValid = mediaList.every(
        (m) => /^https?:\/\/\S+$/i.test(m) || /^\{\{[^}]+\}\}$/.test(m)
      );
      if (!mediaValid) {
        return res.status(400).json({ status: false, message: "Each media item must be an http(s) URL or a {{variable}} placeholder" });
      }
    }

    const actions = (buttons || []).map((b, i) => ({
      title: b.title || null,
      id: b.id || `btn_${i + 1}`,
    }));

    const typePayload =
      templateType === "twilio/quick-reply"
        ? { body, actions }
        : templateType === "twilio/media"
        ? { body, media: mediaList }
        : { body };

    // Build variables map from all {{...}} occurrences across the body and any
    // media URLs, in order of first appearance. Supports both numeric ({{1}})
    // and named ({{qr_code_url}}) Twilio variable styles.
    const variables = {};
    const varPattern = /\{\{([^}]+)\}\}/g;
    const seenVars = [];
    const scanForVars = (text) => {
      varPattern.lastIndex = 0;
      let varMatch;
      while ((varMatch = varPattern.exec(text || "")) !== null) {
        const name = varMatch[1];
        if (!seenVars.includes(name)) seenVars.push(name);
      }
    };
    scanForVars(typePayload.body);
    mediaList.forEach(scanForVars);
    seenVars.forEach((name, i) => {
      const sample = (variable_examples || [])[i];
      if (sample) variables[name] = sample;
    });

    const payload = {
      friendly_name,
      language,
      ...(Object.keys(variables).length > 0 ? { variables } : {}),
      types: {
        [templateType]: typePayload,
      },
    };

    const credentials = Buffer.from(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    ).toString("base64");

    const twilioRes = await fetch("https://content.twilio.com/v1/Content", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await twilioRes.json();

    if (!twilioRes.ok) {
      return res.status(twilioRes.status).json({ status: false, message: data?.message || "Twilio error", details: data });
    }

    // Submit for WhatsApp approval (Marketing category)
    const approvalRes = await fetch(
      `https://content.twilio.com/v1/Content/${data.sid}/ApprovalRequests/whatsapp`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify({
          name: friendly_name,
          category: "MARKETING",
        }),
      }
    );

    const approvalData = await approvalRes.json();

    return res.status(201).json({
      status: true,
      template: data,
      approval: approvalRes.ok ? approvalData : { error: approvalData },
    });
  } catch (error) {
    console.error(`${Date.now()} - Error in /api/twilio/create-template:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

router.get("/api/twilio/approvals", async (req, res) => {
  try {
    const result = await fetchContentTemplates();
    if (!result.status) {
      return res.status(500).json({ status: false, message: "Failed to fetch templates" });
    }

    const credentials = Buffer.from(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    ).toString("base64");

    const approvals = await Promise.all(
      result.result.map(async (template) => {
        try {
          const r = await fetch(
            `https://content.twilio.com/v1/Content/${template.sid}/ApprovalRequests`,
            { headers: { Authorization: `Basic ${credentials}` } }
          );
          const data = await r.json();
          return { sid: template.sid, approval: r.ok ? data : null };
        } catch {
          return { sid: template.sid, approval: null };
        }
      })
    );

    const approvalMap = {};
    for (const { sid, approval } of approvals) {
      approvalMap[sid] = approval;
    }

    return res.json({ status: true, approvals: approvalMap });
  } catch (error) {
    console.error(`${Date.now()} - Error in /api/twilio/approvals:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

/**
 * GET /api/twilio/template-usage/:contentSid
 *
 * Reports how many records reference a template, so the UI can tell the
 * administrator what they are about to do before they commit.
 *
 * ADVISORY ONLY. This is not the gate — the DELETE handler below re-runs the
 * same count and is the thing that actually decides. See the comment there.
 *
 * Auth: server.js mounts authorize_admin on /api/, so an admin session is
 * required before this handler runs.
 */
router.get("/api/twilio/template-usage/:contentSid", (req, res) => {
  const { contentSid } = req.params;

  if (!isValidContentSid(contentSid)) {
    return res
      .status(400)
      .json({ status: false, message: "A valid contentSid is required" });
  }

  try {
    const sendCount = countTemplateSends(contentSid);

    return res.json({
      status: true,
      contentSid,
      sendCount,
      // Only the send count gates deletion. The related counts are context.
      canDelete: sendCount === 0,
      related: countRelatedReferences(contentSid),
    });
  } catch (error) {
    console.error(
      `${Date.now()} - [TemplateDelete] usage check failed. sid=${contentSid}`,
      error
    );

    return res
      .status(500)
      .json({ status: false, message: "Failed to check template usage" });
  }
});

/**
 * DELETE /api/twilio/template/:contentSid
 *
 * Permanently removes a template from the Twilio content library.
 *
 * THIS IS THE AUTHORITATIVE GATE. The usage count is re-run here even though
 * the browser already checked it, and that duplication is deliberate — do not
 * "simplify" it away. messageSender inserts a twilio_template_message row on
 * every send, so a broadcast landing between the browser's pre-flight and the
 * administrator's confirm click would otherwise let a now-referenced template
 * be deleted, silently orphaning the delivery and response logs.
 *
 * Fails closed at every step: a malformed SID, a failed count query, or any
 * non-zero count all stop before Twilio is contacted. There is no path where
 * an unknown usage state ends in a deletion.
 *
 * No local writes occur, so there is no partial state to unwind: by definition
 * nothing references the SID when the delete proceeds.
 */
router.delete("/api/twilio/template/:contentSid", async (req, res) => {
  const { contentSid } = req.params;
  const who = adminIdentity(req);

  if (!isValidContentSid(contentSid)) {
    return res
      .status(400)
      .json({ status: false, message: "A valid contentSid is required" });
  }

  let sendCount;
  try {
    sendCount = countTemplateSends(contentSid);
  } catch (error) {
    console.error(
      `${Date.now()} - [TemplateDelete] ERROR — usage check failed. sid=${contentSid} admin=${who} ip=${req.ip}`,
      error
    );

    return res
      .status(500)
      .json({ status: false, message: "Failed to verify template usage" });
  }

  if (sendCount > 0) {
    console.warn(
      `${Date.now()} - [TemplateDelete] DENIED — in use. sid=${contentSid} count=${sendCount} admin=${who} ip=${req.ip}`
    );

    return res.status(409).json({
      status: false,
      sendCount,
      message: `This template has ${sendCount} recorded send${
        sendCount === 1 ? "" : "s"
      } and cannot be deleted.`,
    });
  }

  const result = await deleteContentTemplate(contentSid);

  if (!result.status) {
    const notFound = result.result?.status === 404;

    console.error(
      `${Date.now()} - [TemplateDelete] ERROR — Twilio remove failed. sid=${contentSid} admin=${who} ip=${req.ip}`,
      result.result
    );

    return res.status(notFound ? 404 : 502).json({
      status: false,
      message: notFound
        ? "Template not found at Twilio"
        : "Twilio rejected the delete request",
    });
  }

  console.log(
    `${Date.now()} - [TemplateDelete] GRANTED — deleted. sid=${contentSid} admin=${who} ip=${req.ip}`
  );

  return res.json({
    status: true,
    contentSid,
    message: "Template deleted",
  });
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
    console.error(`${Date.now()} - Failed to send message`, error);
    res
      .status(500)
      .json({ status: false, message: "Failed to fetch WhatsApp templates" });
  }
});

router.post("/whatsapp/twilio-callback", async (req, res) => {
  try {
    res.sendStatus(202);

    
    db.prepare(`INSERT INTO twilio_delivery (response) VALUES (?)`).run(JSON.stringify(req.body));
    const messageStatus = req.body?.MessageStatus;
    const messageSid = req.body?.MessageSid;
    
    if (messageStatus === "delivered") {
      const phone = req.body?.To?.replace(/^whatsapp:/, "");

      const handleDelivered = db.transaction(() => {
        const row = db.prepare(
          `SELECT contentSid, event_id FROM twilio_template_message WHERE messageSid = ?`
        ).get(messageSid);

        if (!row?.contentSid) {
          db.prepare(`INSERT INTO error_log (error, origin_function) VALUES (?, ?)`).run(
            "CRITICAL ERROR - Cannot fetch the contentSid for auto check",
            "twilio-callback"
          );
          return;
        }

        const contactRow = db.prepare(`SELECT id FROM contact_book WHERE phone = ?`).get(phone);

        if (!contactRow?.id) {
          db.prepare(`INSERT INTO error_log (error, origin_function) VALUES (?, ?)`).run(
            `Contact not found for phone: ${phone}`,
            "twilio-callback"
          );
          return;
        }

        db.prepare(
          `INSERT INTO contact_book_events (contact_book_id, event_id, contentSid) VALUES (?, ?, ?)`
        ).run(contactRow.id, row.event_id, row.contentSid);

        db.prepare(`UPDATE contact_book SET contentSid = ? WHERE phone = ?`).run(row.contentSid, phone);
      });

      handleDelivered();
    }
  } catch (error) {
    console.error(`${Date.now()} - Twilio callback error:`, error);
    db.prepare(`INSERT INTO error_log (error, origin_function) VALUES (?, ?)`).run(
      error.message,
      "twilio-callback"
    );
  }
});

// Columns exposed by the delivery-logs grid that can be filtered / sorted in SQL.
// `templateFriendlyName` is resolved from the Twilio template list in JS, so it
// is handled separately (translated into a contentSid predicate) further down.
const DELIVERY_LOG_SQL_FIELDS = [
  "id",
  "metadata_createdAt",
  "SmsStatus",
  "contentSid",
  "messageSid",
  "full_name",
  "phone",
];

const toArray = (v) => [].concat(v ?? []);

// Match a template friendly name against one grid filter operator.
const matchesTextOperator = (name, operator, value) => {
  const target = String(name ?? "").toLowerCase();
  const needle = String(value ?? "").toLowerCase();
  switch (operator) {
    case "contains":   return target.includes(needle);
    case "equals":     return target === needle;
    case "startsWith": return target.startsWith(needle);
    case "endsWith":   return target.endsWith(needle);
    default:           return false;
  }
};

router.get("/api/whatsapp/twilio-delivery-logs", async (req, res) => {
  try {
    // Keep the date range out of the generic converter — otherwise startDate /
    // endDate would be picked up as legacy column filters.
    const { startDate: rawStart, endDate: rawEnd, tz: _tz, ...gridQuery } = req.query;

    // metadata_createdAt is stored in UTC; every date the client sends and
    // every timestamp sent back is in the browser's own zone.
    const clientTz = resolveClientTimeZone(req);

    const templates = await fetchContentTemplates();
    const templateMap = new Map();
    templates.result.forEach((t) => {
      templateMap.set(t.sid, t.friendlyName);
    });

    // ── Split grid filters: SQL columns vs. the JS-resolved template name ────
    const filterFields    = toArray(gridQuery.filterField);
    const filterOperators = toArray(gridQuery.filterOperator);
    const filterValues    = toArray(gridQuery.filterValue);

    const sqlFilters = { field: [], operator: [], value: [] };
    const templateFilters = [];

    filterFields.forEach((field, i) => {
      const operator = filterOperators[i];
      const value    = filterValues[i];
      if (!field || !operator) return;

      if (field === "templateFriendlyName") {
        templateFilters.push({ operator, value });
        return;
      }
      if (!DELIVERY_LOG_SQL_FIELDS.includes(field)) return; // allowlist guard

      sqlFilters.field.push(field);
      sqlFilters.operator.push(operator);
      sqlFilters.value.push(value ?? "");
    });

    const { pageNumber, limit: rawLimit, sortField, sortOrder, advancedClauses } =
      dbService._QuerySqlConverter(
        {
          ...gridQuery,
          filterField:    sqlFilters.field,
          filterOperator: sqlFilters.operator,
          filterValue:    sqlFilters.value,
        },
        "twilio_delivery"
      );

    const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 25, 1), 100);
    const offset = pageNumber * limit;

    // ── Date range ──────────────────────────────────────────────────────────
    // twilio_delivery.metadata_createdAt is stored as a naive 'YYYY-MM-DD HH:MM:SS'
    // string, so the bounds have to be built in that same format. Comparing it
    // against an ISO timestamp is a plain string comparison in SQLite, and since
    // ' ' sorts before 'T' every row stamped on the start date would be excluded.
    const now = new Date();
    const defaultStart = new Date();
    defaultStart.setDate(now.getDate() - 2);

    const startDate = rawStart ? new Date(rawStart) : defaultStart;
    const endDate = rawEnd ? new Date(rawEnd) : now;

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        status: false,
        message: "Invalid startDate or endDate",
      });
    }

    // A 'YYYY-MM-DD' input parses as UTC midnight, so read the day back in UTC
    // to avoid shifting it by the server's offset.
    const toDayString = (value, raw) =>
      /^\d{4}-\d{2}-\d{2}$/.test(String(raw ?? ""))
        ? String(raw)
        : value.toISOString().slice(0, 10);

    const startDay = toDayString(startDate, rawStart);
    const endDay = toDayString(endDate, rawEnd);

    // Both ends are inclusive: the whole start day and the whole end day, as
    // the client experiences them — so the bounds are built in the client's
    // zone and then shifted to UTC to match the stored column.
    const localStart = `${startDay} 00:00:00`;
    const localEnd = `${endDay} 23:59:59`;
    const start = clientZoneToUtc(localStart, clientTz);
    const end = clientZoneToUtc(localEnd, clientTz);

    // ── WHERE clause: grid filters ──────────────────────────────────────────
    // The date range is pushed down into the CTE instead (see below) — it is a
    // plain column on twilio_delivery, and filtering there keeps the window
    // function from ranking the whole table on every request.
    const whereParts = [];
    const whereParams = [];

    advancedClauses.forEach(({ clause, value }) => {
      whereParts.push(clause);
      if (value !== null) whereParams.push(value);
    });

    // Translate template-name filters into a contentSid predicate.
    const allSids = [...templateMap.keys()];
    templateFilters.forEach(({ operator, value }) => {
      if (operator === "isEmpty") {
        whereParts.push(
          allSids.length
            ? `(contentSid IS NULL OR contentSid NOT IN (${allSids.map(() => "?").join(",")}))`
            : `contentSid IS NULL`
        );
        whereParams.push(...allSids);
        return;
      }
      if (operator === "isNotEmpty") {
        if (!allSids.length) { whereParts.push("1 = 0"); return; }
        whereParts.push(`contentSid IN (${allSids.map(() => "?").join(",")})`);
        whereParams.push(...allSids);
        return;
      }
      if (value == null || value === "") return;

      const matched = allSids.filter((sid) =>
        matchesTextOperator(templateMap.get(sid), operator, value)
      );
      if (!matched.length) { whereParts.push("1 = 0"); return; }
      whereParts.push(`contentSid IN (${matched.map(() => "?").join(",")})`);
      whereParams.push(...matched);
    });

    const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    // ── Sorting (allowlisted to avoid injection) ────────────────────────────
    // The template name has no SQL column; sorting by it orders by its sid.
    const requestedSort =
      sortField === "templateFriendlyName" ? "contentSid" : sortField;
    const safeSortField = DELIVERY_LOG_SQL_FIELDS.includes(requestedSort)
      ? requestedSort
      : "metadata_createdAt";
    const safeSortOrder = String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";

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
      ),
      base AS (
        SELECT id, metadata_createdAt, contentSid, SmsStatus, messageSid, full_name, phone
        FROM ranked WHERE rn = 1
      )
    `;

    const rows = db
      .prepare(
        `${baseCte}
         SELECT * FROM base
         ${whereClause}
         ORDER BY ${safeSortField} ${safeSortOrder}
         LIMIT ? OFFSET ?`
      )
      .all(start, end, ...whereParams, limit, offset);

    // The count is cached per date range *and* filter signature — a cache key
    // built from the dates alone would serve a filtered count to everyone.
    const cacheKey = `${getCountCacheKey(start, end)}__${whereClause}__${JSON.stringify(whereParams)}`;

    let totalCount = countCache.get(cacheKey);
    if (totalCount === undefined) {
      const countRow = db
        .prepare(`${baseCte} SELECT COUNT(*) AS totalCount FROM base ${whereClause}`)
        .get(start, end, ...whereParams);
      totalCount = countRow?.totalCount || 0;
      countCache.set(cacheKey, totalCount);
    }

    const result = rows.map((row) => ({
      ...row,
      templateFriendlyName: templateMap.get(row.contentSid) ?? null,
      metadata_createdAt: toClientZone(row.metadata_createdAt, clientTz),
    }));

    const totalPages = Math.ceil(totalCount / limit);
    const page = pageNumber + 1;

    return res.json({
      status: true,
      result,
      filters: {
        startDate: localStart,
        endDate: localEnd,
        timeZone: clientTz,
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
    console.error(`${Date.now()} - Error in /api/whatsapp/twilio-delivery-logs:`, error);
    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
});

router.get("/api/whatsapp/twilio-response-logs", async (req, res) => {
  try {
    const { pageNumber, limit, sortField, sortOrder, advancedClauses } =
      dbService._QuerySqlConverter(req.query, "twilio_responses");

    // Build parameterised WHERE clause from user filters
    const whereParts = [];
    const filterParams = [];
    advancedClauses.forEach(({ clause, value }) => {
      whereParts.push(clause);
      if (value !== null) filterParams.push(value);
    });
    const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

    // Allowlist sort field to prevent injection
    const ALLOWED_SORT = ["id", "received_at", "full_name", "type", "WaId", "ProfileName", "MessageType", "Body"];
    const safeSortField = ALLOWED_SORT.includes(sortField) ? sortField : "id";
    const safeSortOrder = sortOrder?.toUpperCase() === "ASC" ? "ASC" : "DESC";

    // CTE that deduplicates rows and joins contact names
    const baseCTE = `
      WITH ranked AS (
        SELECT
          tr.id,
          tr.received_at,
          (cb.first_name || ' ' || cb.last_name) AS full_name,
          cb.type,
          json_extract(tr.payload, '$.WaId')         AS WaId,
          json_extract(tr.payload, '$.ProfileName')  AS ProfileName,
          json_extract(tr.payload, '$.MessageType')  AS MessageType,
          json_extract(tr.payload, '$.Body')         AS Body,
          tr.payload,
          ROW_NUMBER() OVER (PARTITION BY tr.id ORDER BY tr.received_at DESC) AS rn
        FROM twilio_responses tr
        LEFT JOIN contact_book cb
          ON cb.phone = '+' || json_extract(tr.payload, '$.WaId')
      ),
      base AS (
        SELECT id, received_at, full_name, type, WaId, ProfileName, MessageType, Body, payload
        FROM ranked WHERE rn = 1
      )
    `;

    const total = db
      .prepare(`${baseCTE} SELECT COUNT(*) AS count FROM base ${whereClause}`)
      .get(...filterParams).count;

    const _data = db
      .prepare(
        `${baseCTE}
         SELECT * FROM base
         ${whereClause}
         ORDER BY ${safeSortField} ${safeSortOrder}
         LIMIT ? OFFSET ?`
      )
      .all(...filterParams, limit, pageNumber * limit);

    // Twilio ISO → UAE
    const data = (_data ?? []).map((item) => {
    return {
        ...item,
        received_at: item.received_at ? toUAE(item.received_at) : null,
    };
    });

    return res.json({
      status: true,
      data,
      total,
      page: pageNumber + 1,
      pageSize: limit,
    });
  } catch (error) {
    console.error(`${Date.now()} - Error in /twilio-response-logs:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

// Admin dashboard opt-out list view (spec 003-twilio-optout-webhook, User
// Story 4). Access control is inherited from the blanket authorize_admin
// middleware applied to all /api/ routes in server.js — no new check needed.
router.get("/api/whatsapp/optout-list", (req, res) => {
  try {
    const { pageNumber, limit, sortField, sortOrder, advancedClauses } =
      dbService._QuerySqlConverter(req.query, "whatsapp_opt_outs");

    const { data: _data, total } = listOptOuts({
      pageNumber,
      limit,
      sortField,
      sortOrder,
      advancedClauses,
    });

    // Epoch ms → UAE, same conversion already applied to received_at above.
    const data = (_data ?? []).map((row) => ({
      ...row,
      opted_out_at: row.opted_out_at ? toUAE(row.opted_out_at) : null,
    }));

    return res.json({ status: true, data, total });
  } catch (error) {
    console.error(`${Date.now()} - Error in /api/whatsapp/optout-list:`, error);
    res.status(500).json({ status: false, message: "Server error" });
  }
});

router.post(
  "/webhooks/whatsapp",
  express.urlencoded({ extended: false }),
  async (req, res) => {
    try {
      const eventId = req.query.eventId ?? undefined;
      const { From, Body, ButtonPayload } = req.body;
      const response = new MessagingResponse();
      response.message("");

      res.writeHead(200, { "Content-Type": "text/xml" });
      res.end(response.toString());

      await handleAutoResponse(From, ButtonPayload, eventId);

      // Independent opt-out backstop (spec 003-twilio-optout-webhook): record
      // known opt-outs ourselves since Twilio exposes no report/API for them.
      // Guarded so a failure here never affects the webhook response above.
      try {
        if (From && Body) {
          const matchedKeyword = matchOptOutKeyword(Body);
          if (matchedKeyword) {
            recordOptOut(From, matchedKeyword);
          }
        }
      } catch (optOutErr) {
        console.error(`${Date.now()} - Failed to record WhatsApp opt-out:`, optOutErr);
      }

      // Fire and forget: save raw payload + log message to DB
      dbService.create("twilio_responses", {
        source: "twilio",
        event_type: "whatsapp.message.received",
        payload: JSON.stringify(req.body),
      });
    } catch (err) {
      console.error(`${Date.now()} - Failed to store Twilio callback:`, err);
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
    console.error(`${Date.now()} - Failed to fetch insights`, err);
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
    console.error(`${Date.now()} - Failed to fetch insights`, err);
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
    console.error(`${Date.now()} - Failed to fetch insights`, err);
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
    console.error(`${Date.now()} - Media download error:`, error);
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

    const filePath = path.resolve(__dirname, "..", "data", "google_data.json");

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
    console.error(`${Date.now()} - Update map URL error:`, error);
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
    console.error(`${Date.now()} - Get map URL error:`, error);
    return res.status(500).json({
      status: false,
      message: "Failed to get map URL",
    });
  }
});

module.exports = router;
