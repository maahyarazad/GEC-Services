const express = require('express');
const router = express.Router();
const {messageSender, fetchMessages, otpSender} = require('../services/whatsAppSender');
const dbService = require('../services/dbService')
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


router.post('/whatsapp/twilio-callback', (req, res) => {
  try {
    console.log('Twilio Status Callback received');
    console.log('Body:', req.body);

    res.sendStatus(202);

    // Fire and forget
    dbService
      .createSafe('twilio_delivery', { response: JSON.stringify(req.body) })
      .catch(err => {
        console.error('Failed to store Twilio callback:', err);
      });

  } catch (error) {
    console.error('Twilio callback error:', error);
    res.sendStatus(200); // still 2xx
  }
});


module.exports = router;