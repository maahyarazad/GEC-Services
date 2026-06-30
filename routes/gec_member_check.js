const express = require('express');
const router  = express.Router();
const { getPool } = require('../services/mysqlService');
const authorization_middleware = require("../middleware/auth");
// GET /gec/members/check?phone_number=...&full_name=...
// Matches by normalized phone OR full name (first_name + ' ' + name).
router.get('/gec-member-check', authorization_middleware.authorize_operator, async (req, res) => {
  const { phone_number, full_name } = req.query;

  if (!phone_number) {
    return res.status(400).json({ status: false, message: 'phone_number query param is required' });
  }

  try {
    const pool = getPool();
    const normalizedPhone = phone_number.replace(/[+\-\s]/g, '');

    const phoneExpr = `REPLACE(REPLACE(REPLACE(ml.phone, '+', ''), '-', ''), ' ', '')`;

    let whereClause;
    let params;

    if (full_name) {
      whereClause = `(${phoneExpr} = ? OR CONCAT(um.first_name, ' ', um.name) = ?)`;
      params = [normalizedPhone, full_name];
    } else {
      whereClause = `${phoneExpr} = ?`;
      params = [normalizedPhone];
    }

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

    return res.json({ status: true, data: rows.length ? rows : [] });
  } catch (err) {
    console.error(`${Date.now()} - GEC members check error:`, err);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
});


module.exports = router;
