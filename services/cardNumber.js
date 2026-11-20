"use strict";

// Next card number for a member type: 5 (German) -> 5000001.., anything else (7) -> 7000001..
// Same rule the member-card sync uses: highest number with the type's prefix, plus one.
function nextCardNumber(db, type) {
  const isGerman = Number(type) === 5;
  const prefix = isGerman ? "5" : "7";
  const base = isGerman ? 5000000 : 7000000;
  const row = db
    .prepare("SELECT MAX(card_number) AS max_num FROM member_card WHERE CAST(card_number AS TEXT) LIKE ?")
    .get(`${prefix}%`);
  return (row?.max_num ?? base) + 1;
}

module.exports = { nextCardNumber };
