const express = require('express');
const router = express.Router();

const dbService = require('../services/dbService')
router.post('/api/contacts', async (req, res) => {
  
   try {
        const result = await messageSender(req);

         res.status(200).json({ status: result.status,message: 'Message sent successfully' });
        
    } catch (error) {
        console.error("Failed to send message", error.message);
        res.status(500).json({ status: false, message: "Failed to send the message" });
    }
});



router.get('/api/contacts', async (req, res) => {
  try {
    const db = dbService.getDB();

    const query = `
      SELECT *
      FROM contact_book
      WHERE phone IS NOT NULL AND blacklist = 0
      GROUP BY phone
    `;

    const result = await new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) {
          console.error('DB error:', err);
          return reject(err);
        }
        resolve(rows);
      });
    });

    res.status(200).json({
      status: true,
      data: result,
    });
  } catch (error) {
    console.error('Failed to fetch contacts:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch contacts',
    });
  }
});


// router.get('/api/contacts', async (req, res) => {
//   try {
//     const db = dbService.getDB();

//     const query = `
//       SELECT COUNT(DISTINCT phone) AS total_contacts
//       FROM contact_book
//     `;






//       res.status(200).json({
//         status: true,
//         contacts: result,
//       });
    
//   } catch (error) {
//     console.error('Failed to fetch contacts:', error);
//     res.status(500).json({
//       status: false,
//       message: 'Failed to fetch contacts',
//     });
//   }
// });


module.exports = router;