require('dotenv').config();
const twilioClient = require("twilio")(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const { parsePhoneNumberFromString } = require("libphonenumber-js");
const dbService = require("../services/dbService");
const db = dbService.getDB();

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

    console.log("WhatsApp message sent:", whatsapp_sender_result);
    return { status: true, result: whatsapp_sender_result.status };
  } catch (error) {
    console.error("WhatsApp sender error:", error.message || error);
    return { status: false, result: error.message || error };
  }
};

function extractPlaceholders(text) {
  const regex = /{{\s*(\d+)\s*}}/g;
  const matches = [...text.matchAll(regex)];
  return matches.map((m) => m[1]); // returns ["1", "2", ...]
}

// Helper to detect placeholders in body
function hasPlaceholders(text) {
  return /{{\s*[^}]+\s*}}/.test(text);
}

const contactBookData = (conditions, useAudience) => {
  let query = "";
  


  if (useAudience === "all") {
    query = `
      SELECT *
      FROM contact_book
      WHERE phone IS NOT NULL AND blacklist = 0
      ${
        Object.keys(conditions).length === 0
          ? ``
          : `AND language = '${conditions?.language?.slice(0, 2)}'`
      }
      AND contentSid IS NULL
      GROUP BY phone 
        ORDER BY
            CASE type
                WHEN 'gec_staff' THEN 1
                WHEN 'club_partner' THEN 2
                WHEN 'club_member' THEN 3
                WHEN 'expert' THEN 4
                WHEN 'difa' THEN 5
                WHEN 'expert_guest' THEN 6
                WHEN 'only_guest' THEN 7
                ELSE 8
            END
       LIMIT 300
    `;
  } else {
    query = `
      SELECT *
      FROM contact_book
      WHERE phone IS NOT NULL AND blacklist = 0
       AND type IN ('${useAudience}')
      ${
        Object.keys(conditions).length === 0
          ? ``
          : `AND language = '${conditions?.language?.slice(0, 2)}'`
      }
      AND contentSid IS NULL GROUP BY phone LIMIT 300
    `;
  }

  const stmt = db.prepare(query);
  const result = stmt.all();

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
      useTestBook,
      useLanguage,
      useAudience,
      template,
      payload,
    } = req.body;

    // Helper function to safely send message and swallow errors

    const safeSendMessage = async (el) => {
      try {
        const phoneNumber = parsePhoneNumberFromString(el.phone);

        if (!phoneNumber || !phoneNumber.isValid()) {
          console.error(`Error sending message to ${el.phone}:`, error);
          dbService.create("error_log", {
            error: error.toString(),
            origin_function: "sendMessageToPhone",
          });
          return null;
        }

        return await sendMessageToPhone(el.phone, template, payload, el);
      } catch (error) {
        console.error(`Error sending message to ${el.phone}:`, error);
        dbService.create("error_log", {
          error: error.toString(),
          origin_function: "sendMessageToPhone",
        });

        return null;
      }
    };

    if (useTestBook) {
      const conditions = { type: "gec_staff" };
      if (useLanguage) {
        conditions.language = template.language;
      }

      const testBook = dbService.findExactWithConditions(
        "contact_book",
        conditions
      );
      await Promise.all(testBook.map(safeSendMessage));

      return { status: true };
    }

    if (useContactBook) {
      const conditions = {};
      if (useLanguage) {
        conditions.language = template.language;
      }

      const contactBook = contactBookData(conditions, useAudience);

      const batchSize = 10; // safe batch size below max throughput
      const delayMs = 1 * 60 * 1000; // 1 minute

      const batches = chunkArray(contactBook, batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        console.log(`Sending batch ${i + 1} of ${batches.length}...`);
        await Promise.all(batch.map(safeSendMessage));
        console.log(`Batch ${i + 1} sent.`);

        // Delay before sending next batch except after last batch
        if (i < batches.length - 1) {
          console.log(
            `Waiting ${delayMs / 60000} minutes before next batch...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    } else {
      await Promise.all(phoneList.map(safeSendMessage));
    }

    return { status: true };
  } catch (error) {
    console.error("WhatsApp sender error:", error);
    // You can decide whether to return false or not here.
  }
};

async function sendMessageToPhone(
  phone,
  template,
  payload,
  contactPayload = null
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
      ];

      Object.keys(payload).forEach((key) => {
        if (payload[key] !== undefined) {
          if (contactPayload) {
            const contactBook_requested_variables = payload[key];

            const splitted = contactBook_requested_variables.split(" ");

            let stringBuilder = "";
            splitted.map((item) => {
              if (valid_requested_variables.includes(item))
                stringBuilder += `${contactPayload[item]} `;
            });

            if (stringBuilder === "") {
              contentVariables[key] = payload[key];
            } else {
              contentVariables[key] = stringBuilder.trimEnd();
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
        messageOptions.body = data.body || "";
        if (Array.isArray(data.media)) {
          messageOptions.mediaUrls = data.media;
        } else if (typeof data.media === "string") {
          messageOptions.mediaUrl = data.media;
        }
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
    dbService.create("twilio_template_message", {
      messageSid: result.sid,
      contentSid: messageOptions.contentSid,
    });

    return result;
  } catch (error) {
    console.error(`Failed to send message to ${phone}:`, error);
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
    console.error("WhatsApp sender error:", error);
    return { status: false, result: error };
  }
};

const deleteContent = async (req, res) => {
  try {
    const templates = await twilioClient.content.v1.contents.list({
      limit: 100,
    });

    // const filtered =
    //   templates
    //     .filter(obj =>
    //      Object.prototype.hasOwnProperty.call(obj.translations, "en")
    //     );

    // const filtered = templates.filter(item =>
    //     item.friendlyName.includes("verify_auto_created") && item.language !== "en"
    // );
    // filtered.forEach(async element => {
    //     await twilioClient.content.v1.contents(element.sid).remove();
    // });
  } catch (error) {
    console.error("WhatsApp sendser error:", error);

    return { status: false, result: error };
  }
};

async function getMessageBody(messageSid) {
  try {
    const message = await twilioClient.messages(messageSid).fetch();
    console.log("Message Body:", message.body);
    return message.body;
  } catch (error) {
    console.error("Failed to fetch message:", error);
    throw error;
  }
}
async function fetchHistory(phone) {
  try {
    const receivedQuery = `
           SELECT
                json_extract(tr.payload, '$.Body') AS body,
                tr.received_at,
                'r' AS type
            FROM twilio_responses tr
            WHERE json_extract(tr.payload, '$.WaId') = ?;
            `;

    const sentQuery = `
            SELECT
                td.*,
                ttm.*
            FROM twilio_delivery td
            LEFT JOIN twilio_template_message ttm
                ON json_extract(td.response, '$.MessageSid') = ttm.messageSid
            WHERE json_extract(td.response, '$.MessageStatus') = 'delivered'
                AND json_extract(td.response, '$.To') = ?
                AND ttm.contentSid = ?;
            `;

    const receivedStmt = db.prepare(receivedQuery);
    const sentStmt = db.prepare(sentQuery);

    const receivedMessages = receivedStmt.all(phone);
    const sentMessages = sentStmt.all(
      `whatsapp:+${phone}`,
      "HXb1ce9479f3d42819bef456f00448afcc"
    );

    const detailedBodies = [];
    if (sentMessages && sentMessages.length > 0) {
      const detailedMessages = await fetchTwilioMessagesDetails(sentMessages);

      for (const item of detailedMessages) {
        const twilioMessage = item.twilioMessage;
        if (twilioMessage) {
          detailedBodies.push({
            body: twilioMessage.body,
            received_at: twilioMessage.dateSent,
            type: "s",
          });
        }
      }
    }

    const combined = [...receivedMessages, ...detailedBodies];

    // Sort by received_at (date string)
    combined.sort((a, b) => new Date(a.received_at) - new Date(b.received_at));

    return combined;
  } catch (error) {
    console.error("Failed to fetch message:", error);
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
        `Failed to fetch Twilio message for SID ${msg.messageSid}:`,
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
  const from = From.replace("whatsapp:", "");

  if (ButtonPayload === "INTERESTED" || ButtonPayload === "ATTEND") {
    const templates = await fetchContentTemplates();
    const second_response_message__en_sid =
      "HX2bdea0d549ccd461d737fe9e321dd651";
    const second_response_message__de_sid =
      "HX6d0c3c5a81fa8cd504f2a3dbfa21cb17";

    const en_template = templates.result.find(
      (x) => x.sid === second_response_message__en_sid
    );
    const de_template = templates.result.find(
      (x) => x.sid === second_response_message__de_sid
    );

    const query = `
        SELECT * FROM contact_book cb
        WHERE cb.phone = '${from}'
    `;

    const stmt = db.prepare(query);
    const contactInfo = stmt.all(); // synchronous, returns rows array

    const phoneList = [{ id: "8176278162873", phone: contactInfo[0].phone }];
    // const media_template = contactInfo[0].type === 'club_member' ? "HX4974a2a0c07f4b9d7b31db0737e87d50" : "HX6b3e75b231d4e0a205d575c3f90b27d3";
    const template =
      contactInfo[0].language === "de" ? de_template : en_template;

    const payload = { 1: `https://maps.app.goo.gl/rCQUvusGWLQTaam89` };

    const result = await messageSender({
      body: { template, phoneList, payload },
    });
  } else {
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
  // 1️⃣ Parse payload
  let payload = {};
  try {
    payload = JSON.parse(row.payload);
  } catch {}

  // 2️⃣ Parse ChannelMetadata if exists
  if (payload.ChannelMetadata) {
    try {
      payload.ChannelMetadata = JSON.parse(payload.ChannelMetadata);
    } catch {}
  }

  // 3️⃣ Merge & flatten
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
  handleAutoResponse,
  flattenObject,
  normalizeRow,
  corruptedContactBookData,
};
