
require('dotenv').config();
const csv = require('csv-parser');
const validator = require('validator');
const { Readable } = require('stream');
const dbService = require("./dbService");
const fetch = require('node-fetch');
function formatDateToMySQL(date) {
    const pad = (n) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
        `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const GSheetService = {

    GSheetParser: async () => {
        try {

            const table_name = "member_card";
            const currentRecords = await dbService.selectDistinctColumnQuery(table_name, "card_number", "> 0")




            // Fetch CSV
            const response = await fetch(process.env.GOOGLE_SHEET_CARDHOLDER);
            console.log(response);
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
                const d = new Date(x["Date Printed"]);
                const card_number = Number(x["Card Number"]);

                // validate card number
                const validCard = Number.isFinite(card_number) && card_number !== 0;

                // check if duplicate
                const duplicate = currentRecords.includes(card_number);

                // date filtering (example: within last year, not older than a month ago)
                const validDate = d >= oneYearAgo;


                return validCard && !duplicate && validDate && !isNaN(d);
            });

            let newObject = [];
            filtered.forEach(x => {

                const card_number = x['Card Number'];
                const printedDate = new Date(x['Date Printed']);
                const expiryDate = formatDateToMySQL(new Date(printedDate.setFullYear(printedDate.getFullYear() + 1)));
                const paid = card_number && card_number[0] === '7' ? 0 : 1;
                const type = card_number ? Number(card_number[0]) : null;
                const normalized = x['Mobile Number'].replace(/[=+'"\s-]/g, '');

                newObject.push({
                    card_number: Number(card_number),
                    paid: paid,
                    Type: type,
                    firstname: x['First Name'],
                    lastname: x['Last Name'],
                    card_expiry_date: expiryDate,
                    email: x['Email Address'],
                    mobile_number: normalized,
                })
            });


            await dbService.createBulk(table_name, newObject);
            console.log("G-sheet data successfully fetched and processed.");


        } catch (err) {
            console.error(err);

        }
    },

    InvitationParser: async (event) => {
        try {


            const response = await fetch(process.env.GOOGLE_SHEET_INVITATIONLIST);

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

            
            const reg_config = await dbService.findExact("registration_config", "page", event);
            const event_date = reg_config[0].event_date;
            const title = reg_config[0].title;
            let register_list = [];


            const filtered = results.filter(x => {
                const email = x['email_'];
                const validEmail = validator.isEmail(email);

                return validEmail

            });

            filtered.forEach(x=>{
              register_list.push({
                firstname: x['Name'],
                lastname: "",
                email: x['email_'],
                phone: x['Normilize_Phone'],
                message: "AUTO_REGISTER",
                event: event,
                event_date: event_date,
                title: title,
              });
            });
            // register_list.push({
            //     firstName: "Maahyar Azad",
            //     lastName: "",
            //     email: "maahyarazad@gmail.com",
            //     phone: "",

            //     message: "AUTO_REGISTER",
            //     event: event,
            //     event_date: event_date,
            //     title: title,

            // });
            // register_list.push({
            //     firstName: "Maahyar Azad",
            //     lastName: "",
            //     email: "mahyar_inc@Yahoo.com",
            //     phone: "",

            //     message: "AUTO_REGISTER",
            //     event: event,
            //     event_date: event_date,
            //     title: title,

            // });



            if (register_list.length > 0) {
                register_list.forEach(x => console.log(x));
                const result = await sendBulkRegistration(register_list);
                return result;
            }


        } catch (err) {
            console.error(err);
            throw err;
        }
    },
}


const sendBulkRegistration = async (register_list) => {
    try {
        for (let i = 0; i < register_list.length; i++) {
            const form = register_list[i];


            const formData = new FormData();

            // Add regular fields
            for (const key in form) {
                formData.append(key, form[key]);
            }

            formData.append('attachment_file', null);

            const response = await fetch(
                `${process.env.CLIENT_ORIGIN}/registration`, 
                // `http://localhost:5501/registration`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "X-User-Lang": "english" },
                    body: JSON.stringify(form),
                });


            if (response.ok) {
                register_list[i].completed = true;
            }else{
                register_list[i].completed = false;
                console.log("Register failed:", register_list[i].email);
            }
            
            const data = await response.json();
            console.log("Registered:", form.email, data);

            // Optional: small delay to avoid spamming server
            await new Promise((r) => setTimeout(r, 200)); // 200ms delay
        }

        return register_list;
    } catch (err) {
        console.error("Bulk registration error:", err);
    }
};


module.exports = GSheetService
