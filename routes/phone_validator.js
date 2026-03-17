const express = require('express');
const router = express.Router();
const { parsePhoneNumberFromString } = require('libphonenumber-js');

router.get('/api/validate-number', async (req, res) => {
  try {
    const phone = req.query.phone || req.body.phone;
    if (!phone) {
      return res.status(400).json({ status: false, message: "Missing 'phone' parameter" });
    }

    
    const phoneNumber = parsePhoneNumberFromString(phone);

    if (!phoneNumber || !phoneNumber.isValid()) {
      return res.json({ status: false, valid: false, message: 'Invalid phone number format' });
    }

    const data = {
      valid: true,
      number: phoneNumber.formatInternational(),
      country: phoneNumber.country,
      type: phoneNumber.getType()
    };

    return res.json({
      status: true,
      data,
      total: 1
    });

  } catch (error) {
    console.error("Error in /api/validate-number:", error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
});

module.exports = router;
