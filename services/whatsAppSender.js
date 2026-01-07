const twilioClient = require("twilio")(
  process.env.TWILIO_ACOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const otpSender = async (data) => {
  const { mobile_number, otp } = data;

  try {
    const whatsapp_sender_result = await twilioClient.messages.create({
      from: "whatsapp:+971521160991",
      to: `whatsapp:${mobile_number}`,
      contentSid: process.env.TWILIO_OTP_CONTENT_SID,
      contentVariables: JSON.stringify({
        1: `${otp}`,
        2: "5 minutes",
      }),
    });

    console.log(whatsapp_sender_result);
    return { status: true, result: whatsapp_sender_result.status };
  } catch (error) {
    console.error("WhatsApp sendser error:", error);

    return { status: false, result: error };
  }
};

const messageSender = async (req) => {
  try {
    const { message, mobile_number } = req.body;

    const whatsapp_sender_result = await twilioClient.messages.create({
      from: "whatsapp:+971521160991",
      to: `whatsapp:${mobile_number}`,
      contentSid: process.env.TWILIO_MESSAGE_CONTENT_SID,
      contentVariables: JSON.stringify({
        1: `${message}`,
      }),
    });

    console.log(whatsapp_sender_result);
    return { status: true, result: whatsapp_sender_result.status };
  } catch (error) {
    console.error("WhatsApp sendser error:", error);

    return { status: false, result: error };
  }
};

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
