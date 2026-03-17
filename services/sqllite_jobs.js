const dbService = require("./dbService");

const Jobs = {
  normilizeMemberPhoneNumbers: async () => {
    try {
      const db = dbService.getDB();
      const query = `
      UPDATE member_card
      SET mobile_number = REPLACE(
                             REPLACE(
                               REPLACE(
                                 REPLACE(
                                   REPLACE(mobile_number, '-', ''),
                                 '+', ''),
                               '.00%', ''),
                             ' ', ''),
                           '=', '')
      WHERE mobile_number LIKE '%-%' 
         OR mobile_number LIKE '%+%' 
         OR mobile_number LIKE '%.00%%'
         OR mobile_number LIKE '% %'
         OR mobile_number LIKE '%=%';
    `;

      const stmt = db.prepare(query);
      const info = stmt.run(); // run() executes UPDATE; returns info object

      console.log("Updated normilizeMemberPhoneNumbers rows:", info.changes);
    } catch (error) {
      console.error("Error normalizing mobile numbers:", error);
    }
  },
};

module.exports = Jobs;
