const express = require('express');
const router = express.Router();
const {messageSender, fetchMessages, otpSender} = require('../services/whatsAppSender');
const dbService = require('../services/dbService')
router.post('/api/whatsapp/send', async (req, res) => {
  
   try {
        const result = await messageSender(req);

         res.status(200).json({ status: result.status,message: 'Message sent successfully' });
        
    } catch (error) {
        console.error("Failed to send message", error.message);
        res.status(500).json({ status: false, message: "Failed to send the message" });
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


router.get('/api/whatsapp/twilio-delivery-logs', async (req, res) => {
  try {

        const table_name = "twilio_delivery";
        const { filters, data } = await dbService.QuerySqlConverter(req.query, table_name);

        const total = await dbService.getTotalCount(table_name, filters);

        return res.json({
            status: true,
            data,
            total
        });

    } catch (error) {
        console.error("Error in /member:", error);
        res.status(500).json({ status: false, message: 'Server error' });
    }
});


router.post("/webhooks/whatsapp", express.urlencoded({ extended: false }), (req, res) => {
    console.log('Incoming WhatsApp message:', req.body);
 const { From, Body, ButtonPayload, ButtonText } = req.body;

  const logMessage = `Incoming message from: ${From}`;
  console.log(logMessage);

  if (ButtonPayload) {
    console.log('User clicked a Quick Reply button!');
    console.log('ButtonPayload:', ButtonPayload);
    console.log('ButtonText:', ButtonText);
  } else {
    console.log('User typed message:', Body);
  }

  // Fire and forget: save raw payload + log message to DB
  dbService.createSafe('api_responses', {
    source: 'twilio',
    event_type: 'whatsapp.message.received',
    payload: JSON.stringify(req.body),
    log_message: logMessage,
  }).catch(err => {
    console.error('Failed to store Twilio callback:', err);
  });

  res.sendStatus(200);
});


module.exports = router;