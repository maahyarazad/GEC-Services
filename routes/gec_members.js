const express = require('express');
const router  = express.Router();
const { getPool } = require('../services/mysqlService');

// NOTE: The single-contact lookup (GET /gec/members/check) was moved to the
// operator-protected registration route: GET /registration/gec-member-check
// (see routes/registration.js).

// POST /api/gec/members/check-batch
// Body: { phone_numbers: string[], full_names?: string[] }
// Matches active members by normalized phone OR full name (first_name + ' ' + name).
router.post('/gec/members/check-batch', async (req, res) => {
  const { phone_numbers, full_names } = req.body;

  if (!Array.isArray(phone_numbers) || phone_numbers.length === 0) {
    return res.status(400).json({ status: false, message: 'phone_numbers array is required' });
  }

  try {
    const pool = getPool();

    const normalizedPhones = phone_numbers.map(p => p.replace(/[+\-\s]/g, ''));
    const phonePlaceholders = normalizedPhones.map(() => '?').join(', ');

    const hasNames = Array.isArray(full_names) && full_names.length > 0;
    const namePlaceholders = hasNames ? full_names.map(() => '?').join(', ') : null;

    const whereClause = hasNames
      ? `(
           REPLACE(REPLACE(REPLACE(ml.phone, '+', ''), '-', ''), ' ', '') IN (${phonePlaceholders})
           OR CONCAT(um.first_name, ' ', um.name) IN (${namePlaceholders})
         )`
      : `REPLACE(REPLACE(REPLACE(ml.phone, '+', ''), '-', ''), ' ', '') IN (${phonePlaceholders})`;

    const params = hasNames ? [...normalizedPhones, ...full_names] : normalizedPhones;

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
         AND ${whereClause}`,
      params
    );

    return res.json({ status: true, data: rows });
  } catch (err) {
    console.error(`${Date.now()} - GEC members batch check error:`, err);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
});

module.exports = router;
