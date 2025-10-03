const fetch = require('node-fetch');
const csv = require('csv-parser');
const { Readable } = require('stream');
const dbService = require("./dbService");

function formatDateToMySQL(date) {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const GSheetParser = async () => {
  try {

    const table_name = "member_card";
    const currentRecords = await dbService.selectDistinctColumnQuery(table_name, "card_number", "> 0")

    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSrwiNr_ACVq8hkB0Wejak8Rk-TV-6nIPYRsxhPzpHvsoQfcsWOMBvmv45rPWiMxv6t_2B2VJcxsGyg/pub?gid=325729194&single=true&output=csv";

    // Fetch CSV
    const response = await fetch(url);
    const csvData = await response.text();

    // Convert CSV text → JSON
    const results = [];
    await new Promise((resolve, reject) => {
      Readable.from(csvData)
        .pipe(csv())
        .on('data', (row) => results.push(row))
        .on('end', resolve)
        .on('error', reject);
    });



    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    const oneMonthsAgo = new Date();
    oneMonthsAgo.setMonth(now.getMonth() - 1);


    const filtered = results.filter(x => {
        const d = new Date(x["Date Received"]);
        const card_number = Number(x["Card Number"]);

        // validate card number
        const validCard = Number.isFinite(card_number) && card_number !== 0;

        // check if duplicate
        const duplicate = currentRecords.includes(card_number);

        // date filtering (example: within last year, not older than a month ago)
        const validDate = d >= oneYearAgo && d <= oneMonthsAgo;

        return validCard && !duplicate && validDate;
    });

    let newObject = [];
    filtered.forEach(x=>{

        const card_number = x['Card Number'];
        const printedDate = new Date(x['Date Printed']);
        const expiryDate = formatDateToMySQL(new Date(printedDate.setFullYear(printedDate.getFullYear() + 1)));
        const paid = card_number && card_number[0] === '7' ? 0 : 1;
        const type = card_number ? Number(card_number[0]) : null;

        newObject.push({
            card_number : Number(card_number), 
            paid :paid,
            Type: type,
            firstname: x['First Name'], 
            lastname: x['Last Name'], 
            card_expiry_date: expiryDate, 
            email: x['Email Address'],
            mobile_number: x['Mobile Number'],
        })
    });


    await dbService.createBulk(table_name, newObject);
    console.log("G-sheet data successfully fetched and processed.");
   

  } catch (err) {
    console.error(err);
   
  }
};

module.exports = {GSheetParser};
