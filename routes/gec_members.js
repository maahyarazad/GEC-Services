const express = require('express');
const router  = express.Router();
const { getPool } = require('../services/mysqlService');

// GET /gec/members/check?phone_number=...
// Returns member record(s) from the GEC MySQL DB matched by phone number,
// filtered to memberships created within the last year.
router.get('/gec/members/check', async (req, res) => {
  const { phone_number } = req.query;

  if (!phone_number) {
    return res.status(400).json({ status: false, message: 'phone_number query param is required' });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT
         um.usrId,
         um.first_name,
         um.name,
         ml.email,
         ml.phone
       FROM __member_login ml
       LEFT JOIN usr_membership um ON um.usrId = ml.user_id
       WHERE um.time BETWEEN DATE_SUB(NOW(), INTERVAL 1 YEAR) AND NOW()
         AND um.id IS NOT NULL
         AND REPLACE(REPLACE(REPLACE(ml.phone, '+', ''), '-', ''), ' ', '') = ?`,
      [ phone_number.replace(/[+\-\s]/g, '')]
    );

    return res.json({ status: true, data: rows.length ? rows : [] });
  } catch (err) {
    console.error('GEC members check error:', err);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
});

// POST /api/gec/members/check-batch
// Body: { phone_numbers: string[] }
// Returns all matching active-member rows in one query.
router.post('/gec/members/check-batch', async (req, res) => {
  const { phone_numbers } = req.body;

  if (!Array.isArray(phone_numbers) || phone_numbers.length === 0) {
    return res.status(400).json({ status: false, message: 'phone_numbers array is required' });
  }

  try {
    const pool = getPool();

const normalizedPhones = phone_numbers.map(phone =>
  phone.replace(/[+\-\s]/g, '')
);

const placeholders = normalizedPhones.map(() => '?').join(', ');

const [rows] = await pool.query(
  `SELECT
      um.usrId,
      um.time,
      um.first_name,
      um.name,
      ml.email,
      ml.phone
   FROM __member_login ml
   LEFT JOIN usr_membership um ON um.usrId = ml.user_id
   WHERE um.time BETWEEN DATE_SUB(NOW(), INTERVAL 1 YEAR) AND NOW()
     AND um.id IS NOT NULL
     AND REPLACE(REPLACE(REPLACE(ml.phone, '+', ''), '-', ''), ' ', '')
         IN (${placeholders})`,
  normalizedPhones
);

    return res.json({ status: true, data: rows });
  } catch (err) {
    console.error('GEC members batch check error:', err);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
});

module.exports = router;
