const twilioClient = require("twilio")(
  process.env.TWILIO_ACOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);



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
      throw new Error("Cannot send message to the sender's own WhatsApp number.");
    }

    const whatsapp_sender_result = await twilioClient.messages.create({
      from: "whatsapp:+971521160991",
      to: `whatsapp:${mobile_number}`,
        
      contentSid: process.env.TWILIO_OTP_CONTENT_SID,
      contentVariables: JSON.stringify({
        1: '1623',
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


// const messageSender = async (req) => {
//   try {
//     const { message, mobile_number } = req.body;

//     const whatsapp_sender_result = await twilioClient.messages.create({
//       from: "whatsapp:+971521160991",
//       to: `whatsapp:${mobile_number}`,
//       contentSid: process.env.TWILIO_MESSAGE_CONTENT_SID,
//       contentVariables: JSON.stringify({
//         1: `${message}`,
//       }),
//     });

//     console.log(whatsapp_sender_result);
//     return { status: true, result: whatsapp_sender_result.status };
//   } catch (error) {
//     console.error("WhatsApp sendser error:", error);

//     return { status: false, result: error };
//   }
// };


const messageSender = async (req) => {
  try {
    const { template, mobile_number } = req.body;

    // Determine template type key (e.g., "twilio/text", "twilio/media", etc.)
const templateType = Object.keys(template.types)[0];
const data = template.types[templateType];

    // Base message options
    const messageOptions = {
    from: "whatsapp:+971521160991",
      to: `whatsapp:${mobile_number}`,
      contentSid: template.sid,
      messagingServiceSid: process.env.TWILIO_SERVICE_SID,
    };

// Helper to detect placeholders in body
function hasPlaceholders(text) {
  return /{{\s*[^}]+\s*}}/.test(text);
}

switch (templateType) {
  case "whatsapp/authentication": 
  
  if (data.body && hasPlaceholders(data.body)) {
      
      messageOptions.contentVariables = JSON.stringify({
        1: '1623',
        2: "5 minutes",
        
      });
    }
  
   break;
  case "twilio/text": 
    if (data.body && hasPlaceholders(data.body)) {
      
      messageOptions.contentVariables = JSON.stringify({
        1: "Your dynamic content here",    
        
      });
    }
  
    break;
  case "twilio/call-to-action":
    if (data.body && hasPlaceholders(data.body)) {
      // Prepare contentVariables — replace with your actual dynamic data mapping
      messageOptions.contentVariables = JSON.stringify({
        1: "Your dynamic content here",    // Map based on placeholders in data.body
        first_name: "John",                 // Example for {{first_name}}
      });
    }
    // else: no placeholders, so no contentVariables needed
    break;

  case "twilio/media":
    messageOptions.body = data.body || "";
    if (Array.isArray(data.media)) {
      messageOptions.mediaUrls = data.media; // Twilio supports mediaUrls as array
    } else if (typeof data.media === "string") {
      messageOptions.mediaUrl = data.media;
    }
    break;

  case "twilio/list-picker":     break;
  case "twilio/quick-reply":     break;
  case "twilio/card":
    messageOptions.interactive = buildInteractiveMessage(templateType, data);
    break;

  default:
    throw new Error(`Unsupported template type: ${templateType}`);
}

    const result = await twilioClient.messages.create(messageOptions);
    console.log("Message sent:", result);
    return { status: true, result: result.status };
  } catch (error) {
    console.error("WhatsApp sender error:", error);
    return { status: false, result: error.message || error };
  }
};

// Helper function to build interactive object for WhatsApp interactive messages
function buildInteractiveMessage(type, data) {
  switch (type) {
    case "twilio/list-picker":
      return {
        type: "list",
        body: { text: data.body.replace("{{order_number}}", "12345").replace("{{date}}", "Jan 10") },
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
        body: { text: data.title + (data.subtitle ? "\n" + data.subtitle : "") },
        header: data.media && data.media.length > 0 ? { type: "image", image: { link: data.media[0] } } : undefined,
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

const fetchMessages = async () => {
  try {
    const templates = await twilioClient.content.v1.contents.list({ limit: 100 });
    return { status: true, result: templates };
  } catch (error) {
    console.error("WhatsApp sender error:", error);
    return { status: false, result: error };
  }
};

const deleteContent = async (req, res) => {
  try {
    const templates = await twilioClient.content.v1.contents.list({ limit: 100 });


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


module.exports = { otpSender, messageSender, fetchMessages };
