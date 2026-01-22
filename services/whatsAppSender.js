const twilioClient = require("twilio")(
  process.env.TWILIO_ACOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

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

const contactBookData = async () => {
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

  return result;
};

const messageSender = async (req) => {
  try {
    const { phoneList, useContactBook, useTestBook } = req.body;

    if (useTestBook) {
      const testBook = await dbService.findExactWithConditions("contact_book", {
        type: "gec_staff",
      });

      await Promise.all(
        testBook.map(async (el) => {
          const phone = el.phone;
          const { template, payload } = req.body;
          return sendMessageToPhone(phone, template, payload, el);
        })
      );
      return { status: true };
    }

    if (useContactBook) {
      const contactBook = await contactBookData();
      const randomContacts = getRandomItems(contactBook, 350);

      const batchSize = 60; // safe batch size below max throughput
      const delayMs = 1000; // 1 second delay between batches

      const batches = chunkArray(randomContacts, batchSize);

      for (const batch of batches) {
        await Promise.all(
          batch.map(async (el) => {
            const phone = el.phone;
            const { template, payload } = req.body;
            return sendMessageToPhone(phone, template, payload, el);
          })
        );

        // Delay before sending next batch to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } else {
      await Promise.all(
        phoneList.map(async (el) => {
          const phone = el.phone;
          const { template, payload } = req.body;
          return sendMessageToPhone(phone, template, payload);
        })
      );
    }

    return { status: true };
  } catch (error) {
    console.error("WhatsApp sender error:", error);
    return { status: false, result: error.message || error };
  }
};

async function sendMessageToPhone(
  phone,
  template,
  payload,
  contactPayload = null
) {
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
      messageOptions.interactive = buildInteractiveMessage(templateType, data);
      break;
    default:
      throw new Error(`Unsupported template type: ${templateType}`);
  }

  const result = await twilioClient.messages.create(messageOptions);
  dbService
    .createSafe("twilio_template_message", {
      messageSid: result.sid,
      contentSid: messageOptions.contentSid,
    })
    .catch((err) => {
      console.error("Failed to store Twilio callback:", err);
    });

  return result;
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

function getRandomItems(array, count) {
  const arrCopy = [...array]; // copy to avoid mutating original
  for (let i = arrCopy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arrCopy[i], arrCopy[j]] = [arrCopy[j], arrCopy[i]];
  }
  return arrCopy.slice(0, count);
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function handleAutoResponse(From, ButtonPayload) {
  const from = From.replace("whatsapp:", "");

  if (ButtonPayload === "INTERESTED" || ButtonPayload === "ATTEND") {
    const templates = await fetchContentTemplates();

    
    const query = `
    SELECT * FROM contact_book cb
    WHERE cb.phone = '${from}'
    
    `;
    
    const contactInfo = await new Promise((resolve, reject) => {
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error("DB error:", err);
                return reject(err);
            }
            resolve(rows);
        });
    });
    
    const phoneList = [{ id: "8176278162873", phone: contactInfo[0].phone }];
    // const media_template = contactInfo[0].type === 'club_member' ? "HX4974a2a0c07f4b9d7b31db0737e87d50" : "HX6b3e75b231d4e0a205d575c3f90b27d3";
    
    const template = templates.result.find((x) => x.sid === 'HX8b9664f6b44014a6597627be81349003');

    const payload = {
      1: `${contactInfo[0].first_name} ${contactInfo[0].last_name}`,
      2: "ClubTime Dubai",
      3: "27 January 2026",
      4: "From 7:00 PM",
      5: "Media One Hotel Dubai, QWERTY Restaurant",
    };

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
}

 const normalizeRow =  (row) => {
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
}


module.exports = {
  otpSender,
  messageSender,
  fetchContentTemplates,
  handleAutoResponse,
  flattenObject,
  normalizeRow
};
