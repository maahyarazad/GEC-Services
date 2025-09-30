const express = require('express');
const router = express.Router();
const authorize_admin = require("../middleware/auth")
const twilioClient = require('twilio')(process.env.TWILIO_ACOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const dbService = require("../services/dbService");

router.post('/whatsapp-sender', async (req, res) => {
  const { mobile_number, otp } = req.body;

  try {

      const service = await twilioClient.messaging.v1
    .services(process.env.TWILIO_SERVICE_SID)
    .fetch();

  console.log(service.sid);

    const message = await twilioClient.messages.create({
      messagingServiceSid: process.env.TWILIO_SERVICE_SID,
      to: `whatsapp:${mobile_number}`,
    contentSid: "HXbdc228d683b012d1edbaa1a8fd61212a", // your template ID
      contentVariables: JSON.stringify({
        1: "John" // maps to {{1}} in your template
      }),
    });

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