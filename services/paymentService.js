
//Generate the date used in record ids
const generateRecordDate = async () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    // return `${year}${month}${day}`;
    return `${day}${month}${year}`;
};


//CREATE A RECORD RECEIPT ON REGISTRATION BUTTON CLICK
//DONE BEFORE SENDING USER TO PAYMENNT LANDING PAGE
app.post("/create-record", async (req, res) => {
    let { data, amount } = req.body;
    // console.log("record data is", data);

    if (!amount) {
        const event = data.registeredForEvent.split("/")[1];
        const eventslist = await getFile(eventsPath);
        const match = eventslist.find((item) => item.id === event);
        amount = match.amount;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue)) {
        return res.status(400).json({ message: "Amount must be a valid number." });
    }

    const fee = Math.round(amountValue * 100) / 100;
    console.log(`the fee is ${fee}`);

    try {
        const parse = await getFile(recordsPath);
        const matchingRecord = parse.find((item) => item.userId === data.id);

        //redundancy check
        if (matchingRecord) {
            return res.status(200).json({
                message: "Matching record found",
                data: matchingRecord,
            });
        }

        //gets the suffix '010, 011, etc...'
        const lastRecord = parse[parse.length - 1];
        if (!lastRecord) {
            return res.status(400).json({ message: "No existing records found." });
        }

        data.userId = data.id;
        data.sourceId = data.source;
        delete data.id;
        delete data.source;
        data.recordType = "Event Participation Fee";
        data.recordFee = fee;
        data.vat = 0.05;
        (data.suffix = (parseInt(lastRecord.id.split("-")[4]) + 1)
            .toString()
            .padStart(3, "0")),
            (data.id = `GEC-EC-GUEST-${await generateRecordDate()}`);
        parse.push(data);

        await writeFile(recordsPath, parse);
        res.status(201).json({
            message: "Record created successfully!",
            data: data,
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



//SEND SIGNAL TO PAYMENNT
app.post("/paymennt", async (req, res) => {
    console.log("Reached paymennt endpoint");
    const receipt = req.body;
    const order = {
        requestId: `ordexc-${receipt.id}`,
        orderId: receipt.id,
        currency: "AED",
        amount: receipt.recordFee * (1 + receipt.vat),
        totals: {
            subtotal: receipt.recordFee,
            tax: receipt.recordFee * receipt.vat,
            shipping: 0,
            handling: 0,
            discount: 0,
            skipTotalsValidation: false,
        },
        items: [
            {
                name: `${receipt.recordType} - ${receipt.registeredForEvent}`,
                sku: "018297",
                unitprice: receipt.recordFee,
                quantity: 1,
                linetotal: receipt.recordFee,
            },
        ],
        customer: {
            id: receipt.userId,
            firstName: receipt.firstName,
            lastName: receipt.lastName,
            email: receipt.email,
            phone: receipt.phoneNumber,
        },
        billingAddress: {
            name: `${receipt.firstName} ${receipt.lastName}`,
            address1: "GEC Expert Circle",
            address2: "",
            city: "Dubai",
            state: "Dubai",
            zip: "12345",
            country: "AE",
            set: true,
        },
        returnUrl: `{}/success`,
        branchId: 0,
        allowedPaymentMethods: [],
        defaultPaymentMethod: "CARD",
        language: "EN",
    };

    // console.log(order);

    try {
        const { default: fetch } = await import("node-fetch"); //Don't know why, but this makes it work.
        const url = process.env.PAYMENNTTESTURL;
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Paymennt-Api-Key": process.env.PAYMENNTTESTAPIKEY,
                "X-Paymennt-Api-Secret": process.env.PAYMENNTTESTAPISECRET,
            },
            body: JSON.stringify(order),
        });

        if (!response.ok) {
            const errorMessage = await response.text();
            return res.status(response.status).json({
                error: {
                    status: response.status,
                    message: errorMessage,
                },
            });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("Error occurred with paymennt:", error);
        res.status(500).json({ message: "Error occurred with paymennt" });
    }
});