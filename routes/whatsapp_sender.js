const express = require('express');
const router = express.Router();
const {messageSender} = require('../services/whatsAppSender');

router.post('/whatsapp-sender', async (req, res) => {
  
   try {

        const result = await messageSender(req);

        return { status: result.status, code: 200, message: 'Message sent successfully' };
    } catch (error) {
        console.error("Failed to send message", error.message);
        return { status: false, code: 500, message: 'Failed to send the message' };
    }
});

module.exports = router;