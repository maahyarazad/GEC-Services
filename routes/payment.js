const express = require("express");
const router = express.Router();
const path = require("path");
const fetch = require("node-fetch");
const dbService = require("../services/dbService");
require('dotenv').config();
const multer = require("multer");
const { generateRecordId } = require("../services/generatorService");
const { generateQRWithText } = require("../services/qrGenerator");
const { generateApplePass } = require("../services/applePassService");
const { company_data_confirmation_email, event_confirm_registration_email_with_invoice } = require("../services/emailService");
const { generateInvoice } = require("../services/invoiceService");
const { generateGooglePass } = require("../services/googlePassService");
const upload = multer({
    storage: multer.memoryStorage()
    , limits: { fileSize: 5 * 1024 * 1024 }
}); // 5MB max
const fs = require("fs").promises;
// keep only DB table columns
const allowedKeys = [
    "id",
    "firstName",
    "lastName",
    "phoneNumber",
    "whatsapp",
    "email",
    "registeredForEvent",
    "registrationDate",
    "status",
    "userId",
    "sourceId",
    "recordType",
    "recordFee",
    "vat"
];

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc'); 
const timezone = require('dayjs/plugin/timezone'); 

dayjs.extend(utc);
dayjs.extend(timezone);


router.get("/latest/:currency", async (req, res) => {
    const { currency } = req.params;
    try {
        const response = await fetch(`https://open.er-api.com/v6/latest/${currency}`);
        const data = await response.json();
        res.json(data); // forward JSON to client
    }
    catch (err) {
        console.error("Currency fetch error:", err);
        res.status(500).json({ error: "Failed to fetch currency data", details: err.message });
    }
});


router.get('/payment', async (req, res) => {
    try {

        const table_name = "event_proforma_invoice";
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

//CREATE A RECORD RECEIPT ON REGISTRATION BUTTON CLICK
//DONE BEFORE SENDING USER TO PAYMENNT LANDING PAGE
router.post("/payment/create-record", upload.none(), async (req, res) => {
    const userTimezone = req.get('X-User-Timezone'); 
    const table_name = "event_proforma_invoice";
    const { registration_code, title, event_date, ...data } = req.body;
    const uniqeIdentifier = generateRecordId(data.event, false);


    const amountValue = parseFloat(data.recordFee);
    if (isNaN(amountValue)) {
        return res.status(400).json({ message: "Amount must be a valid number." });
    }

    data.id = `PI-${uniqeIdentifier}`;
    data.userId = uniqeIdentifier;
    data.registeredForEvent = data.event;
    data.status = false;
    data.sourceId = data.registration_config_id;
    data.recordType = "Event Participation Fee";
    const currency = String(data.currency).replace(/['"]/g, "").trim();
    data.vat = currency === "AED" ? 0.05 : 0;

    const sanitized = Object.fromEntries(
        Object.entries(data)
            .map(([key, value]) => {
                if (key === "phone") return ["phoneNumber", value]; // rename to match schema
                return [key, value];
            })
            .filter(([key]) => allowedKeys.includes(key)) // keep only allowed keys
    );


    try {

        create_result = await dbService.createSafe(table_name, sanitized);

        const order = await prepareOrder(data, userTimezone);

        // Step 2: Forward the saved record to payment endpoint
        console.log(order)
        const paymentResponse = await fetch(`${process.env.PAYMENNTTESTURL}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Paymennt-Api-Key": process.env.PAYMENNTTESTAPIKEY,
                "X-Paymennt-Api-Secret": process.env.PAYMENNTTESTAPISECRET,
            },
            body: JSON.stringify(order),
        });

        if (!paymentResponse.ok) {
            const errorMessage = await paymentResponse.text();
            return res.status(paymentResponse.status).json({
                error: {
                    status: paymentResponse.status,
                    message: errorMessage,
                },
            });
        }

        const paymentData = await paymentResponse.json();

        console.log(paymentData);
        // Step 3: Return combined response
        return res.status(201).json({
            message: "Record created and payment initiated successfully!",
            record: sanitized,
            payment: paymentData,
        });

    } catch (error) {
        console.log(error);
        return res
            .status(500)
            .json({ message: "Internal Server Error", error: error.message });
    }
});



/*EXAMPLE OUTPUT*/
/*
  {
    "firstName": "Lars",
    "lastName": "Jordan",
    "phoneNumber": "+971509893374",
    "whatsapp": "+971509893374",
    "email": "lars-jordan@hotmail.de",
    "registeredForEvent": "Expert Circle Meeting/ec-45492450",
    "registrationDate": "2025-05-19T17:57:53.957Z",
    "status": false,
    "userId": "gec00ecg47677474",
    "sourceId": "Elisabeth",
    "recordType": "Event Participation Fee",
    "recordFee": 60,
    "vat": 0.05,
    "id": "GEC-EC-GUEST-19052025-006"
  },

*/


router.get("/payment/status/:checkoutId", async (req, res) => {
    const { checkoutId } = req.params;

    if (!checkoutId) {
        return res.status(400).json({ message: "checkoutId is required" });
    }

    try {
        let registration_config;
        const response = await fetch(`https://api.test.paymennt.com/mer/v2.0/checkout/${checkoutId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "X-Paymennt-Api-Key": process.env.PAYMENNTTESTAPIKEY,
                "X-Paymennt-Api-Secret": process.env.PAYMENNTTESTAPISECRET,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                message: "Error fetching payment status",
                error: data,
            });
        }
        //http://localhost:5175/registration/wirtschaftswunder-middle-east-wachstum-und-profitabilitat-fur-ihr-unternehmen-the/success?reference=ordexc-PI-gec-wmewupfiut-17581835476538241&checkout=1843589075646491537
        if (data.result.status === "PAID") {

            const performa_invoice_data = await dbService.findById("event_proforma_invoice", data.result.orderId);
            
            const registration_config = await dbService.findById("registration_config", performa_invoice_data.sourceId);
            
            let selected_time_for_email = "";

            if (registration_config.metadata_json !== "") {
              
               const _data = await dbService.findExact("registration", "event_id", performa_invoice_data.userId);
               const config_metadata = JSON.parse(registration_config.metadata_json);

               if (_data.length > 0) {
                   const _metadata_json = JSON.parse(_data[0].metadata_json)
                   // Convert selected_time to Date object
                   
                    

                    const selectedDate_UTC = dayjs(_metadata_json.selected_time).utc();
                    const selectedDate = selectedDate_UTC.tz(data.result.billingAddress.city);
                    const selectedHour = selectedDate.hour();
                    selected_time_for_email = `${selectedHour}:00`;
                    



                   // Fill the slot for that hour with the selected_time
                   if (config_metadata.slots && config_metadata.slots.hasOwnProperty(selectedHour)) {
                       config_metadata.slots[selectedHour] = {hour: selectedHour, registerant_info:{
                            fullname: `${performa_invoice_data.firstName} ${performa_invoice_data.lastName}`,
                            email:performa_invoice_data.email,
                            phoneNumber:performa_invoice_data.phoneNumber
                        }};
                   }
               }

               registration_config.metadata_json = JSON.stringify(config_metadata);
               try{
                    await dbService.update("registration_config", registration_config.id, registration_config);

                }catch(err){
                    return res.status(400).json({ status: false, message: 'This slot has already been reserved. Please clear the cache using the Clear Cache button and try again.' });
                }
               
           }
            registration_config.email = performa_invoice_data.email;
            
            registration_config.event = performa_invoice_data.registeredForEvent;
            
            registration_config.event_id = performa_invoice_data.userId;


            const qrPath = path.join(__dirname, ".." ,"qr-files", `${registration_config.event_id}.png`);

            // skip creating qrcode on refresh page
            try {
                await fs.access(qrPath); // will throw if not found
                console.log("QR already exists, skipping generation.");
            } catch {
                await generateQRWithText(registration_config.event, registration_config.event_id);
                
            }

            const qrBuffer = await fs.readFile(qrPath);
            
    
            // convert to base64 strings
            const qrBase64 = qrBuffer.toString("base64");
            
            registration_config.image = `data:image/png;base64,${qrBase64}`
            
            const invoice_filename = `INVOICE-${getAttachedInvoiceFilename(data)}.pdf`;
            // Maahyar CM: In case of multiple refresh we don't want to send duplicate email
            if (performa_invoice_data !== null && performa_invoice_data.status === 1) {
                
                return res.status(200).json({
                    message: "Payment status retrieved successfully",
                    data: registration_config
                });
            }
            
            const passData = {
                event_id: performa_invoice_data.userId,
                firstName: performa_invoice_data.firstName,
                lastName: performa_invoice_data.lastName,
                title: performa_invoice_data.registeredForEvent,
                event_page: performa_invoice_data.registeredForEvent,
                event_date: registration_config.event_date,
            };

            await generateApplePass(passData);
            const googleWalletLink = await generateGooglePass(passData);


            // Maahyar CM:
            // Change the pre invoice order status and also use the data.customer json to add the missing that to the registration record
            await generateInvoice({ invoice_data: { ...performa_invoice_data }, payment_data: { ...data.result } });

            await ProcessRequest({invoice_filename, ...registration_config, selected_time_for_email, googleWalletLink});

            if (performa_invoice_data) {
                performa_invoice_data.status = true;

                await dbService.update("event_proforma_invoice", performa_invoice_data.id, performa_invoice_data);

                return res.status(200).json({
                    message: "Payment status retrieved successfully",
                    data: registration_config
                });
            }
        }

    } catch (error) {
        console.error("Error fetching payment status:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }


});

async function prepareOrder(data, userTimezone) {
    const tax = Math.round(Number(data.recordFee) * data.vat);

    const subtotal = Math.round(Number(data.recordFee));
    const sanitized = {};
    const filteredOut = {};

    // Create registration record here and mark it as unpaid 

    Object.entries(data).forEach(([key, value]) => {
        const newKey = key === "phone" ? "phoneNumber" : key;

        if (allowedKeys.includes(newKey)) {
            sanitized[newKey] = value;
        } else {
            filteredOut[key] = value; // keep the removed keys here
        }
    });


    await handleRegistration(filteredOut, sanitized)

    return {
        requestId: `ordexc-${sanitized.id}`,
        orderId: sanitized.id,
        currency: JSON.parse(data.currency),
        amount: subtotal + tax,
        totals: {
            subtotal: subtotal,
            tax: tax,
            shipping: 0,
            handling: 0,
            discount: 0,
            skipTotalsValidation: false,
        },
        items: [
            {
                name: `${sanitized.recordType} - ${sanitized.registeredForEvent}`,
                sku: "018297",
                unitprice: sanitized.recordFee,
                quantity: 1,
                linetotal: sanitized.recordFee,
            },
        ],
        customer: {
            id: sanitized.userId,
            firstName: sanitized.firstName,
            lastName: sanitized.lastName,
            email: sanitized.email,
            phone: sanitized.phoneNumber,
        },
        billingAddress: {
            name: `${sanitized.firstName} ${sanitized.lastName}`,
            address1: sanitized.registeredForEvent,
            address2: filteredOut.companyName,
            city: userTimezone,
            state: "Dubai",
            zip: "00000",
            country: "AE",
            set: true,
        },
        metadata: {
            ...filteredOut, set: true
        },
        returnUrl: `${process.env.CLIENT_ORIGIN}/registration/${sanitized.registeredForEvent}/success`,
        branchId: 0,
        allowedPaymentMethods: [],
        defaultPaymentMethod: "CARD",
        language: "EN",
    };
}


async function handleRegistration(data, sanitized) {
    try {
        let table_name;
        let event_time, event_location, event_location_name;

        data.email = sanitized.email;
        data.firstName = sanitized.firstName;
        data.lastName = sanitized.lastName;
        data.phone = sanitized.phoneNumber;
        data.whatsapp = sanitized.whatsapp;


        // Check registration key and max tokens
        const key = await dbService.findExact("registration_keys", "key", data.registration_code);

        // if (!file) {
        //     const max_token_value = await dbService.findExact("registration_config", "page", data.event);
        //     event_time = max_token_value[0]?.event_time;
        //     event_location = max_token_value[0]?.event_location;
        //     event_location_name = max_token_value[0]?.event_location_name;

        //     const maxTokens = Number(max_token_value[0]?.maxTokensPerGuest);
        //     let currentCount = 0;

        //     if (key && key.length > 0) {
        //         currentCount = Number(key[0].tokenCount);
        //     } else {
        //         const count_token = await dbService.findByConditions("registration", {
        //             phone: data.phone,
        //             event: data.event,
        //         });
        //         currentCount = Number(count_token.length);
        //     }

        //     if (isNaN(maxTokens) || isNaN(currentCount)) {
        //         return { status: false, message: "Invalid registration configuration or user data." };
        //     }

        //     if (currentCount >= maxTokens) {
        //         return {
        //             status: false,
        //             message: "You have reached the maximum number of registrations allowed for this event.",
        //         };
        //     }
        // }

        // if (file) {
        //     data.attachment_file = uniqueFileName; // assume uniqueFileName is set outside
        // }

        // data.event_id = generateRecordId(data.event, false);

        let create_result;
        delete data.registration_config_id;
        delete data.currency;

        if (data.company_data) {
            table_name = "Company";
            const { event, event_id, company_data } = data;
            const company_data_ = JSON.parse(company_data);
            const company_data__ = Object.fromEntries(
                Object.entries(company_data_).map(([key, value]) => [key.replace(/^company_/, ""), value])
            );
            company_data__.event = event;
            company_data__.event_id = event_id;

            create_result = await dbService.createSafe(table_name, company_data__);
            await company_data_confirmation_email(data);
        } else if (data.gic_data) {
            table_name = "GIC_Users";
            const gic_data_ = JSON.parse(data.gic_data);
            const gic_data__ = Object.fromEntries(
                Object.entries(gic_data_).map(([key, value]) => [key.replace(/^gic_/, ""), value])
            );

            const duplicateRecord = await dbService.countExact(table_name, "email", gic_data__.email);

        } else {
            table_name = "registration";

            data.event_id = sanitized.userId;
            const metadata = {};
            Object.entries(data).forEach(([key, value]) => {
                if (key.startsWith("metadata_")) {
                    
                    if (value !== null && value!== "") {

                        // Strip the prefix if you want clean keys in JSON
                        const cleanKey = key.replace("metadata_", "");
                        
                        metadata[cleanKey] = value;
                    }
                }
                
            });


            Object.keys(data).forEach((key) => {
                if (key.startsWith("metadata_")) {

                    delete data[key];
                }
            });

             if (Object.keys(metadata).length > 0) {
                data.metadata_json = JSON.stringify(metadata);
             }

            create_result = await dbService.createSafe(table_name, data);
        }

    } catch (error) {
        console.error(error);
        throw error
    }
}

async function ProcessRequest(data) {
    try {

        await event_confirm_registration_email_with_invoice(data);

    } catch (error) {
        console.error("Edit error:", error);
        throw error;
    }
}


function getAttachedInvoiceFilename(data) {
    const isoDate = data.result.timestamp;
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // months are 0-based
    return `GWC-${day}${month}-${date.getFullYear()}-${data.result.id.slice(data.result.id.length - 4, data.result.id.length)}`;
}


module.exports = router;
