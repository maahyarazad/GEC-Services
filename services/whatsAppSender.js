require("dotenv").config();
const twilioClient = require("twilio")(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const { parsePhoneNumberFromString } = require("libphonenumber-js");
const dbService = require("../services/dbService");
const db = dbService.getDB();
const fs = require("fs");
const path = require("path");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const {generateQR_WhatsApp} = require("../services/qrGenerator");

dayjs.extend(utc);
dayjs.extend(timezone);

const UAE_TZ = "Asia/Dubai";

// Helper: parse any date string → UAE dayjs object
const toUAE = (dateStr) => {
  if (!dateStr) return null;

  return dayjs.utc(dateStr).tz(UAE_TZ);
};

const otpSender = async (req) => {
  let { mobile_number, otp } = req.body;

  try {
    // Basic validation & normalization of mobile_number
    if (!mobile_number) throw new Error("Mobile number is required");

    // Remove spaces, dashes, parentheses, etc.
    mobile_number = mobile_number.replace(/[\s()-]/g, "");

    // Ensure it starts with '+' and only digits after
    if (!/^\+\d{7,15}$/.test(mobile_number)) {
      throw new Error("Invalid phone number format. Must be E.164 format.");
    }

    // Prevent sending to the same number as your WhatsApp sender
    if (mobile_number === "+971521160991") {
      throw new Error(
        "Cannot send message to the sender's own WhatsApp number."
      );
    }

    const whatsapp_sender_result = await twilioClient.messages.create({
      from: "whatsapp:+971521160991",
      to: `whatsapp:${mobile_number}`,

      contentSid: process.env.TWILIO_OTP_CONTENT_SID,
      contentVariables: JSON.stringify({
        1: "1623",
        2: "5 minutes",
      }),
    });

    console.log(`${Date.now()} - WhatsApp message sent:`, whatsapp_sender_result);
    return { status: true, result: whatsapp_sender_result.status };
  } catch (error) {
    console.error(`${Date.now()} - WhatsApp sender error:`, error.message || error);
    return { status: false, result: error.message || error };
  }
};

function extractPlaceholders(text) {
  const regex = /{{\s*(\d+)\s*}}/g;
  const matches = [...text.matchAll(regex)];
  return matches.map((m) => m[1]); // returns ["1", "2", ...]
}

async function enrichPhoneListWithContactData(phoneList, db) {
  const phoneNumbers = phoneList.map((item) => item.phone);

  const placeholders = phoneNumbers.map(() => "?").join(", ");

  const query = `
    SELECT 
      id,
      title,
      first_name,
      last_name,
      gender,
      phone,
      language,
      type,
      club_partner_name,
      blacklist,
      contentSid
    FROM contact_book
    WHERE phone IN (${placeholders})
  `;

  // better-sqlite3: prepare first, then call .all() on the statement
  const contactRows = db.prepare(query).all(...phoneNumbers);

  const contactMap = new Map(contactRows.map((row) => [row.phone, row]));

  const enrichedList = phoneList.map((item) => {
    const contact = contactMap.get(item.phone);

    if (!contact) {
      return { ...item, contactFound: false };
    }

    return {
      ...item,
      contactFound: true,
      contactId: contact.id,
      title: contact.title,
      first_name: contact.first_name,
      last_name: contact.last_name,
      gender: contact.gender,
      language: contact.language,
      type: contact.type,
      club_partner_name: contact.club_partner_name,
      blacklist: contact.blacklist,
      contentSid: contact.contentSid,
    };
  });

  return enrichedList;
}


// Helper to detect placeholders in body
function hasPlaceholders(text) {
  return /{{\s*[^}]+\s*}}/.test(text);
}

const contactBookData = (conditions, useAudience, eventId) => {
  const params = { eventId: Number(eventId) };

  let languageFilter = "";
  if (conditions?.language) {
    languageFilter = "AND cb.language = @language";
    params.language = conditions.language.slice(0, 2);
  }

  let query = "";

  if (useAudience === "all") {
    query = `
      WITH excluded_guests AS (
        SELECT contact_book_id
        FROM event_guest_list
        WHERE event_id = @eventId
      )
      SELECT *
      FROM contact_book AS cb
      WHERE cb.phone IS NOT NULL
        AND cb.blacklist = 0
        ${languageFilter}
        AND cb.contentSid IS NULL
        AND cb.id    NOT IN (SELECT contact_book_id FROM excluded_guests)
        AND cb.type  NOT IN ('Wüstenkinder', 'expert_guest', 'only_guest')
        AND cb.phone NOT IN (SELECT phone FROM unsubscribe_contacts)
      GROUP BY cb.phone
      ORDER BY
        CASE cb.type
          WHEN 'gec_staff'       THEN 1
          WHEN 'club_partner'    THEN 2
          WHEN 'club_member'     THEN 3
          WHEN 'expert'          THEN 4
          WHEN 'difa'            THEN 5
          WHEN 'medical_society' THEN 6
          ELSE                        7
        END
    `;
  } else {
    params.useAudience = useAudience;
    params.senderLimit = Number(conditions.senderLimit);

    query = `
      WITH excluded_guests AS (
        SELECT contact_book_id
        FROM event_guest_list
        WHERE event_id = @eventId
      )
      SELECT *
      FROM contact_book AS cb
      WHERE cb.phone IS NOT NULL
        AND cb.blacklist = 0
        AND cb.id    NOT IN (SELECT contact_book_id FROM excluded_guests)
        AND cb.phone NOT IN (SELECT phone FROM unsubscribe_contacts)
        AND cb.type  IN (@useAudience)
        ${languageFilter}
        AND cb.contentSid IS NULL
      GROUP BY cb.phone
      LIMIT @senderLimit
    `;
  }

  const stmt = db.prepare(query);
  const result = stmt.all(params);

  return result;
};

const corruptedContactBookData = (conditions) => {
  const query = `
      SELECT *
      FROM contact_book
    `;

  const stmt = db.prepare(query);
  const result = stmt.all();

  result.forEach((el) => {
    try {
      const phoneNumber = parsePhoneNumberFromString(el.phone);

      if (!phoneNumber) {
        el.phone_validation = false;
        el.phone_invalid_reason = "Parsing failed";
      } else if (!phoneNumber.isValid()) {
        el.phone_validation = false;
        el.phone_invalid_reason = "Number format invalid";
      } else {
        el.phone_validation = true;
        el.phone_invalid_reason = null;
      }
    } catch (error) {
      el.phone_validation = false;
      el.phone_invalid_reason = "Exception: " + error.message;
    }
  });

  return result.filter((el) => el.phone_validation === false);
};

const messageSender = async (req) => {
  try {
    const {
      phoneList,
      useContactBook,
      useGuestList,
      useLanguage,
      useAudience,
      template,
      payload,
      senderLimit,
      eventId,
    } = req.body;

    // Helper function to safely send message and swallow errors

    const safeSendMessage = async (el, eventId) => {
      try {
        const phoneNumber = parsePhoneNumberFromString(el.phone);

        if (!phoneNumber || !phoneNumber.isValid()) {
          console.error(`${Date.now()} - Error sending message to ${el.phone}:`, error);
          dbService.create("error_log", {
            error: error.toString(),
            origin_function: "sendMessageToPhone",
          });
          return null;
        }

        if (process.env.ENVIRONMENT === "PRODUCTION") {
            return await sendMessageToPhone(
                el.phone,
                template,
                payload,
                el,
                eventId
            );
        }
      } catch (err) {
        console.error(`${Date.now()} - Error sending message to ${el.phone}:`, err);
        dbService.create("error_log", {
          error: `Error sending message to ${el.phone} - ${err.toString()}`,
          origin_function: "sendMessageToPhone",
        });

        return null;
      }
    };

    if (useGuestList) {

      const query = `SELECT * FROM contact_book WHERE id IN(
             SELECT contact_book_id FROM event_guest_list WHERE event_id = ? and language = ? )`;
      const stmt = db.prepare(query);
      const result = stmt.all([Number(eventId), template.language.slice(0, 2)]);

        await Promise.all(
            result.map(async (x) => {
                x.qr_code_url = await generateQR_WhatsApp(Number(x.id), Number(eventId));
            })
        );

        
        await Promise.all(result.map((x) => safeSendMessage(x, eventId)));
    }

    if (useContactBook) {
      const conditions = {};
      conditions.senderLimit = senderLimit;
      if (useLanguage) {
        conditions.language = template.language;
      }

      const contactBook = contactBookData(conditions, useAudience, eventId);

      let batchSize = 10; // safe batch size below max throughput
      let delayMs = 1 * 60 * 1000; // 1 minute
      if (useAudience === "Wüstenkinder") {
        batchSize = 25;
        delayMs = 15 * 60 * 1000; // 15 minutes
      }

      const batches = chunkArray(contactBook, batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        console.log(`${Date.now()} - Sending batch ${i + 1} of ${batches.length}...`);
        await Promise.all(batch.map((x) => safeSendMessage(x, eventId)));
        console.log(`${Date.now()} - Batch ${i + 1} sent.`);

        // Delay before sending next batch except after last batch
        if (i < batches.length - 1) {
          console.log(
            `${Date.now()} - Waiting ${delayMs / 60000} minutes before next batch...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    } else {

        const templateType = Object.keys(template?.types)?.[0];
        const enrichedPhoneList = await enrichPhoneListWithContactData(phoneList, db);
        
        if (templateType && templateType === 'twilio/media') {
            await Promise.all(
                enrichedPhoneList.map(async (x) => {
                    x.qr_code_url = await generateQR_WhatsApp(Number(x.contactId), Number(eventId));
                })
            );
        }

        await Promise.all(enrichedPhoneList.map((x) => safeSendMessage(x, eventId)));
    }

    return { status: true };
  } catch (error) {
    console.error(`${Date.now()} - WhatsApp sender error:`, error); 
    // You can decide whether to return false or not here.
  }
};

async function sendMessageToPhone(
  phone,
  template,
  payload,
  contactPayload = null,
  eventId
) {
  try {
    // Determine template type key (e.g., "twilio/text", "twilio/media", etc.)
    const templateType = Object.keys(template.types)[0];
    const data = template.types[templateType];

    // Base message options
    const messageOptions = {
      from: "whatsapp:+971521160991",
      to: `whatsapp:${phone}`,
      contentSid: template.sid,
      messagingServiceSid: process.env.TWILIO_SERVICE_SID,
    };

    if (payload !== null && Object.keys(payload).length > 0) {
      const contentVariables = {};
      const valid_requested_variables = [
        "id",
        "title",
        "first_name",
        "last_name",
        "gender",
        "phone",
        "type",
        "club_partner_name",
        "blacklist",
        "qr_code_url",
      ];

      Object.keys(payload).forEach((key) => {
        if (payload[key] !== undefined) {
          if (contactPayload) {
            const contactBook_requested_variables = payload[key];

            const splitted = contactBook_requested_variables.split(" ");

            let stringBuilder = "";
            splitted.forEach((item) => {
              if (!valid_requested_variables.includes(item)) return;

              switch (contactPayload.language) {
                case "de":
                  switch (contactPayload[item]) {
                    case "male":
                      stringBuilder += `Herr`;
                      return;
                    case "female":
                      stringBuilder += `Frau`;
                      return;
                  }
                  break;
                case "en":
                  switch (contactPayload[item]) {
                    case "male":
                      stringBuilder += `Mr.`;
                      return;
                    case "female":
                      stringBuilder += `Ms.`;
                      return;
                  }
                  break;
              }

              stringBuilder += `${contactPayload[item]}`;
            });

            if (stringBuilder === "") {
                contentVariables[key] = payload[key];
            } else {
               // If the ContactPayload doesn't have the value of the Template we simple make it empty 
              contentVariables[key] = stringBuilder.trimEnd() === 'null' ? '' : stringBuilder.trimEnd();;
            }
          } else {
            contentVariables[key] = payload[key];
          }
        }
      });

      if (Object.keys(contentVariables).length > 0) {
        messageOptions.contentVariables = JSON.stringify(contentVariables);
      }
    }

    switch (templateType) {
      case "whatsapp/authentication":
        break;
      case "twilio/text":
        break;
      case "twilio/call-to-action":
        if (data.body && hasPlaceholders(data.body)) {
          messageOptions.contentVariables = JSON.stringify({
            1: "Your dynamic content here",
            first_name: "John",
          });
        }
        break;
      case "twilio/media":
        // this for default
        // messageOptions.body = data.body || "";
        // if (Array.isArray(data.media)) {
        //   messageOptions.mediaUrls = data.body;
        // } else if (typeof data.media === "string") {
        //   messageOptions.mediaUrl = data.media;
        // }
        
        break;
      case "twilio/list-picker":
        break;
      case "twilio/quick-reply":
        break;
      case "twilio/card":
        messageOptions.interactive = buildInteractiveMessage(
          templateType,
          data
        );
        break;
      default:
        throw new Error(`Unsupported template type: ${templateType}`);
    }

    const result = await twilioClient.messages.create(messageOptions);
    
    await Promise.resolve(
      db
        .prepare(
          `INSERT INTO twilio_template_message (messageSid, contentSid, event_id) VALUES (?, ?, ?)`
        )
        .run(result.sid, messageOptions.contentSid, Number(eventId))
    );

    return result;
  } catch (error) {
    console.error(`${Date.now()} - Failed to send message to ${phone}:`, error);
    // swallow error so caller can continue
    return null;
  }
}

// Helper function to build interactive object for WhatsApp interactive messages
function buildInteractiveMessage(type, data) {
  switch (type) {
    case "twilio/list-picker":
      return {
        type: "list",
        body: {
          text: data.body
            .replace("{{order_number}}", "12345")
            .replace("{{date}}", "Jan 10"),
        },
        action: {
          button: data.button || "Select an option",
          sections: [
            {
              title: "Options",
              rows: data.items.map((item) => ({
                id: item.id,
                title: item.item,
                description: item.description || "",
              })),
            },
          ],
        },
      };

    case "twilio/quick-reply":
      return {
        type: "button",
        body: { text: data.body },
        action: {
          buttons: data.actions.map((action) => ({
            type: "reply",
            reply: {
              id: action.id,
              title: action.title,
            },
          })),
        },
      };

    case "twilio/card":
      // WhatsApp doesn't directly support cards but you can send a media message with buttons
      // Twilio WhatsApp supports "buttons" with media, so you can construct accordingly
      // Example here:
      return {
        type: "button",
        body: {
          text: data.title + (data.subtitle ? "\n" + data.subtitle : ""),
        },
        header:
          data.media && data.media.length > 0
            ? { type: "image", image: { link: data.media[0] } }
            : undefined,
        action: {
          buttons: (data.actions || []).map((action, idx) => ({
            type: "reply",
            reply: {
              id: action.id || `btn_${idx}`,
              title: action.title || "Button",
            },
          })),
        },
      };

    default:
      throw new Error(`Interactive message type not supported: ${type}`);
  }
}

const fetchContentTemplates = async () => {
  try {
    const templates = await twilioClient.content.v1.contents.list({
      limit: 100,
    });
    return { status: true, result: templates };
  } catch (error) {
    console.error(`${Date.now()} - WhatsApp sender error:`, error);
    return { status: false, result: error };
  }
};

/**
 * Deletes a content template from the Twilio content library.
 *
 * Transport-agnostic on purpose: it takes a SID and returns the same
 * { status, result } shape as fetchContentTemplates, so routes own req/res.
 *
 * It performs NO authorisation and NO usage checking. The caller is
 * responsible for both — see the delete route in routes/whatsapp_sender.js,
 * which is the authoritative gate.
 *
 * Never throws; failures come back as { status: false, result: error } so the
 * caller can map them onto a status code.
 *
 * @param {string} contentSid
 * @returns {Promise<{status: boolean, result: unknown}>}
 */
const deleteContentTemplate = async (contentSid) => {
  try {
    await twilioClient.content.v1.contents(contentSid).remove();

    return { status: true, result: true };
  } catch (error) {
    console.error(`${Date.now()} - Twilio template delete error:`, error);

    return { status: false, result: error };
  }
};

async function getMessageBody(messageSid) {
  try {
    const message = await twilioClient.messages(messageSid).fetch();
    console.log(`${Date.now()} - Message Body:`, message.body);
    return message.body;
  } catch (error) {
    console.error(`${Date.now()} - Failed to fetch message:`, error);
    throw error;
  }
}

async function fetchHistory(phone) {
  try {
    const toNumber = `whatsapp:+${phone}`;

    const sentQuery = `
      SELECT 
        ttm.messageSid,
        td.metadata_createdAt
      FROM twilio_delivery td
      INNER JOIN twilio_template_message ttm
        ON json_extract(td.response, '$.MessageSid') = ttm.messageSid
      WHERE json_extract(td.response, '$.MessageStatus') = 'delivered'
        AND json_extract(td.response, '$.To') = ?
        AND ttm.contentSid IS NOT NULL
      ORDER BY td.metadata_createdAt DESC
    `;

    const receivedQuery = `
      SELECT
        json_extract(tr.payload, '$.Body')              AS body,
        json_extract(tr.payload, '$.MediaUrl0')         AS media_url,
        json_extract(tr.payload, '$.MediaContentType0') AS media_type,
        tr.received_at,
        'r' AS type
      FROM twilio_responses tr
      WHERE json_extract(tr.payload, '$.WaId') = ?
    `;

    const allSentMessages = db.prepare(sentQuery).all(toNumber);
    const receivedMessages = db.prepare(receivedQuery).all(phone);

    let detailedBodies = [];

    if (allSentMessages.length > 0) {
      const detailedMessages = await fetchTwilioMessagesDetails(
        allSentMessages
      );

      detailedBodies = detailedMessages
        .filter((item) => item.twilioMessage)
        .map((item) => ({
          body: item.twilioMessage.body,
          received_at: toUAE(item.twilioMessage.dateSent), // Twilio ISO → UAE
          type: "s",
        }));
    }

    const normalizedReceived = receivedMessages.map((msg) => ({
      ...msg,
      received_at: toUAE(msg.received_at), // SQLite UTC bare string → UAE
    }));

    const combined = [...normalizedReceived, ...detailedBodies].sort(
      (a, b) => a.received_at.valueOf() - b.received_at.valueOf() // dayjs .valueOf() for ms comparison
    );

    // Optional: format for display
    return combined.map((msg) => ({
      ...msg,
      received_at: msg.received_at.format("YYYY-MM-DD HH:mm:ss"),
    }));
  } catch (error) {
    console.error(`${Date.now()} - Failed to fetch message:`, error);
    throw error;
  }
}

async function fetchEvent(From) {
  try {
    const from = From.replace("whatsapp:", "");
    const toNumber = `whatsapp:+${from}`;

//console.log(`fetchEvent const From = ${From}`);
//console.log(`fetchEvent const from = ${from}`);



    const historyQuery = `
      -- Received messages
      SELECT
          json_extract(tr.payload, '$.Body')              AS body,
          json_extract(tr.payload, '$.MediaUrl0')         AS media_url,
          json_extract(tr.payload, '$.MediaContentType0') AS media_type,
          NULL                                            AS messageSid,
          NULL                                            AS contentSid,
          NULL                                            AS event_id,
          datetime(tr.received_at, '+4 hours')            AS received_at,
          'r'                                             AS type
      FROM twilio_responses tr
      WHERE json_extract(tr.payload, '$.WaId') = ?

      UNION ALL

      -- Sent messages
      SELECT
          NULL                                            AS body,
          NULL                                            AS media_url,
          NULL                                            AS media_type,
          ttm.messageSid                                  AS messageSid,
          ttm.contentSid                                  AS contentSid,
          ttm.event_id                                    AS event_id,
          datetime(td.metadata_createdAt, '+4 hours')     AS received_at,
          's'                                             AS type
      FROM twilio_delivery td
      INNER JOIN twilio_template_message ttm
          ON json_extract(td.response, '$.MessageSid') = ttm.messageSid
      WHERE json_extract(td.response, '$.MessageStatus') = 'delivered'
        AND json_extract(td.response, '$.To')           = ?
        AND ttm.contentSid IS NOT NULL

      ORDER BY received_at DESC
      LIMIT 1;
    `;

    // First ? = WaId (bare number), second ? = To (whatsapp:+...)
    const row = db.prepare(historyQuery).all(from, From)[0];

    const eventId = (row?.type === 's' ? row.event_id : null) ?? 0;

    //console.log(`fetchEvent const eventId = ${eventId}`);
    
    return Number(eventId);
  } catch (error) {
    console.error(`${Date.now()} - Failed to fetch event:`, error);
    throw error;
  }
}

async function fetchTwilioMessagesDetails(sentMessages) {
  // Map each messageSid to a fetch Promise
  const fetchPromises = sentMessages.map(async (msg) => {
    try {
      // messageSid is in your local record as `msg.messageSid`
      const twilioMessage = await twilioClient.messages(msg.messageSid).fetch();
      return {
        localRecord: msg,
        twilioMessage, // full details from Twilio
      };
    } catch (error) {
      console.error(
        `${Date.now()} - Failed to fetch Twilio message for SID ${msg.messageSid}:`,
        error
      );
      return {
        localRecord: msg,
        twilioMessage: null,
        error,
      };
    }
  });

  // Wait for all to resolve
  const results = await Promise.all(fetchPromises);

  return results;
}

async function handleAutoResponse(From, ButtonPayload) {
  try {
    const from = From.replace("whatsapp:", "");
    const contact = db
      .prepare(`SELECT * FROM contact_book WHERE phone = ?`)
      .get(from);

      if (!contact) return;
    console.log(`Contact found: ${From}`);  
    console.log(`ButtonPayload: ${ButtonPayload}`);  
    console.log(`Contact: ${JSON.stringify(contact)}`);  


    const templates = await fetchContentTemplates();
    const phoneList = [{ id: "8176278162873", phone: contact.phone }];
    const simpleResponseTemplate = templates.result.find((x) => x.sid === "HXb1ce9479f3d42819bef456f00448afcc");

    if (!simpleResponseTemplate) {
      console.error(`${Date.now()} - handleAutoResponse: auto-response template HXb1ce9479f3d42819bef456f00448afcc not found`);
      return;
    }

    if (ButtonPayload === "ATTEND") {

      const event_id = await fetchEvent(From);

      const event = db
        .prepare(`SELECT * FROM events WHERE id = ?`)
        .get(event_id);
      
      const guestTypes = ["expert_guest", "only_guest", "Wüstenkinder"];

      const type = guestTypes.includes(contact.type) ? "guest" : "general";  

      const payload = { 1: event[`auto_response_${type}_${contact.language}`] };

        console.log(`event_id ${event_id}`);
        console.log(`event ${event}`);
        console.log(`payload ${payload}`);
        
      await messageSender({ body: { template: simpleResponseTemplate, phoneList, payload } });

      dbService.create("event_guest_list", {
        contact_book_id: Number(contact.id),
        event_id: Number(event.id),
      });
    }

    if (ButtonPayload === "NOT_ATTEND") {
          
          const replyMessage = contact.language === "de" 
          ? "Danke für deine Nachricht. Schade, dass es nicht klappt. Dann freue ich mich, dich beim nächsten Mal zu sehen." 
          : "Thank you for your reply. Sad to hear that, but let's meet next time.";

          const payload = { 1: replyMessage };
          await messageSender({ body: { template: simpleResponseTemplate, phoneList, payload } });
    }

    if (ButtonPayload === "UNSUBSCRIBE") {
        const replyMessage = contact.language === "de" 
        ? "Sie werden keine Nachrichten mehr von uns erhalten."
        : "You will no longer receive messages from us."; 
         
          const payload = { 1: replyMessage };
          await messageSender({ body: { template: simpleResponseTemplate, phoneList, payload } });

        const insert = db.prepare(`INSERT INTO unsubscribe_contacts (phone) VALUES (?)`);
        insert.run(from);
    }

  } catch (e) {
    console.error(`${Date.now()} -`, e);
  }
}

const flattenObject = (obj, parentKey = "", result = {}) => {
  for (const key in obj) {
    const newKey = parentKey ? `${parentKey}_${key}` : key;

    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      flattenObject(obj[key], newKey, result);
    } else {
      result[newKey] = obj[key];
    }
  }
  return result;
};

const normalizeRow = (row) => {
  // Parse payload
  let payload = {};
  try {
    payload = JSON.parse(row.payload);
  } catch {}

  //  Parse ChannelMetadata if exists
  if (payload.ChannelMetadata) {
    try {
      payload.ChannelMetadata = JSON.parse(payload.ChannelMetadata);
    } catch {}
  }

  // Merge & flatten
  return flattenObject({
    ...row,
    payload,
  });
};

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

module.exports = {
  fetchHistory,
  otpSender,
  messageSender,
  fetchContentTemplates,
  deleteContentTemplate,
  handleAutoResponse,
  flattenObject,
  normalizeRow,
  corruptedContactBookData,
};
