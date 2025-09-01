const express = require("express");
const router = express.Router();
const path = require("path");
const dbService = require("../services/dbService");
require('dotenv').config();
const multer = require("multer");
const { generateRecordId } = require("../services/generatorService");
const  {generateQRWithText} = require("../services/qrGenerator");
const {event_confirm_registration_email, company_data_confirmation_email} = require("../services/emailService");
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

//CREATE A RECORD RECEIPT ON REGISTRATION BUTTON CLICK
//DONE BEFORE SENDING USER TO PAYMENNT LANDING PAGE
router.post("/payment/create-record", upload.none(), async (req, res) => {

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
    const fee = Math.round(amountValue * 100) / 100;
    data.recordFee = fee;
    data.vat = 0.05;

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
        const order = await prepareOrder(data)
        // Step 2: Forward the saved record to payment endpoint
        const { default: fetch } = await import("node-fetch");
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

        console.log(paymentData.result);
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

        if(data.result.status === "PAID"){

            const performa_invoice_data = await dbService.findById("event_proforma_invoice", data.result.orderId);
            // Maahyar CM:
            // Change the pre invoice order status and also use the data.customer json to add the missing that to the registration record

            if(performa_invoice_data){
                performa_invoice_data.status = true;
                await dbService.update("event_proforma_invoice",performa_invoice_data.id, performa_invoice_data );
                
                registration_config = await dbService.findById("registration_config", performa_invoice_data.sourceId);
                registration_config.email = performa_invoice_data.email;
                registration_config.event = performa_invoice_data.registeredForEvent;
                registration_config.event_id = performa_invoice_data.userId;
                
                await ProcessRequest(registration_config);

                const qrPath = `./qr-files/${registration_config.event_id}.png`;
                const [qrBuffer] = await Promise.all([
                    fs.readFile(qrPath),
                ]);

                // convert to base64 strings
                const qrBase64 = qrBuffer.toString("base64");

                registration_config.image = `data:image/png;base64,${qrBase64}`
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

async function prepareOrder(data) {
    const tax = data.recordFee * data.vat;
    const totalAmount = data.recordFee + tax;
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
        currency: "AED",
        amount: totalAmount,
        totals: {
            subtotal: sanitized.recordFee,
            tax,
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
            address2: "",
            city: "Dubai",
            state: "Dubai",
            zip: "12345",
            country: "AE",
            set: true,
        },
        metadata: {
             ...filteredOut  
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
            delete data.registration_config_id;
            data.event_id = sanitized.userId
            create_result = await dbService.createSafe(table_name, data);
        }
        
    } catch (error) {
        console.error(error);
        throw error
    }
}

async function ProcessRequest (data) {
    try {
        
        await generateQRWithText(data.event, data.event_id);
        await event_confirm_registration_email(data);
        

    } catch (error) {
        console.error("Edit error:", error);
        throw error;
    }
} 
    

module.exports = router;
