const express = require('express');
const router = express.Router();
const authorize_admin = require("../middleware/auth")
const twilioClient = require('twilio')(process.env.TWILIO_ACOUNT_SID, process.env.TWILIO_AUTH_TOKEN) ;
  // twilioClient.region = 'au1';
// twilioClient.edge = 'sydney';
const dbService = require("../services/dbService");

router.post('/whatsapp-sender', async (req, res) => {
  const { mobile_number, otp } = req.body;

  try {

      const service = await twilioClient.messaging.v1
    .services(process.env.TWILIO_SERVICE_SID)
    .fetch();

      const message = await twilioClient.messages.create({
        from: "whatsapp:+971521160991", // or use messagingServiceSid
        to: `whatsapp:${mobile_number}`,
        contentSid: process.env.TWILIO_OTP_CONTENT_SID, // your template ID
        contentVariables: JSON.stringify({
          "1": "654321",     // OTP code
          "2": "5 minutes"   // code expiration (optional, if template supports)
        }),
      });
      
      console.log(message);
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully via WhatsApp',
      sid: service.sid, // optional, Twilio message SID
    });
  } catch (error) {
    console.error('WhatsApp send error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to send OTP via WhatsApp',
      error: error.message, // you can remove this in production
    });
  }
});

module.exports = router;