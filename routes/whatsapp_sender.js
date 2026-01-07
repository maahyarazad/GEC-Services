const express = require('express');
const router = express.Router();
const {messageSender, fetchMessages, otpSender} = require('../services/whatsAppSender');

router.post('/api/whatsapp/send', async (req, res) => {
  
   try {
        const result = await messageSender(req);

        return { status: result.status, code: 200, message: 'Message sent successfully' };
    } catch (error) {
        console.error("Failed to send message", error.message);
        return { status: false, code: 500, message: 'Failed to send the message' };
    }
});

router.get('/api/whatsapp/list', async (req, res) => {
  try {
    const result = await fetchMessages(req, res);
    if (result.status) {
      res.status(200).json({ status: true, templates: result.result });
    } else {
      res.status(500).json({ status: false, error: result.result });
    }
  } catch (error) {
    console.error("Failed to send message", error);
    res.status(500).json({ status: false, message: "Failed to fetch WhatsApp templates" });
  }
});




module.exports = router;