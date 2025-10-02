const twilioClient = require('twilio')(process.env.TWILIO_ACOUNT_SID, process.env.TWILIO_AUTH_TOKEN);


const otpSender = async (data) => {
    const { mobile_number, otp } = data;

    try {

        const whatsapp_sender_result = await twilioClient.messages.create({
            from: "whatsapp:+971521160991",
            to: `whatsapp:${mobile_number}`,
            contentSid: process.env.TWILIO_OTP_CONTENT_SID, 
            contentVariables: JSON.stringify({
                "1": `${otp}`,
                "2": "5 minutes"
            }),
        });

        console.log(whatsapp_sender_result);
        return { status: true, result: whatsapp_sender_result.status };

    } catch (error) {
        console.error('WhatsApp sendser error:', error);

        return { status: false, result: error };
    }
};

module.exports = { otpSender };