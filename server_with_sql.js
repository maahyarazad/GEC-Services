const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const sqlite3 = require("sqlite3").verbose();
const app = express();
const bcrypt = require("bcrypt");
const PORT = process.env.PORT || 5500;
const dbService = require("./services/dbService");
const { generateRecordId, generateOTP } = require("./services/generatorService");
const { generateRecordDate, generateRecordDateTime } = require("./services/dateService");
const { exportTableAsCSV } = require("./services/csvParser");

const session = require('express-session');


const accountSid = 'ACf20c6fdcff4554153d18e319b1741de5';
const authToken = '169c6a86516341663e70d61cf416fe3f';
const twilioPhone = "whatsapp:+14155238886";
const client = require('twilio')(accountSid, authToken);

// Setup DB connection
const db = new sqlite3.Database("./app.db", (err) => {
    if (err) {
        console.error("Failed to connect to database:", err.message);
    } else {
        console.log("Connected to SQLite database.");
    }
});


// Read and apply SQL schema from app_tables.sql
(async () => {
    try {
        const sql = await fs.readFile("./create_tables.sql", "utf8");
        db.exec(sql, (err) => {
            if (err) {
                console.error("Failed to create tables:", err.message);
            } else {
                console.log("Tables created or already exist.");
            }
        });
    } catch (err) {
        console.error("Error reading SQL file:", err.message);
    }
})();



app.use(session({
    secret: 'your-secret-key',       // required
    resave: false,                   // don't save session if unmodified
    saveUninitialized: true,         // save new but empty sessions
    cookie: {
        maxAge: 5 * 60 * 1000, // 5 minutes
        httpOnly: true,
        secure: false, // true only if you're using HTTPS
        sameSite: 'lax', // or 'none' if cross-site with credentials
    }
}));


app.use(cors({
    origin: 'http://localhost:5173', // your frontend URL
    credentials: true
}));

app.use(express.json());

app.use((req, res, next) => {
    console.log(`Received request for: ${req.url}`);
    next();
});

app.use('/uploads', express.static(path.join(__dirname, 'file_storage')));

const hashthis = async (hashitem) => {
    const saltRounds = 10; // You can adjust the number of salt rounds as needed
    const salt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(hashitem.toString(), salt);
    return hash;
};



//DEFINE PATHS
const leadsListPath = "./data/leads_list.json";
const accessPath = "./data/access.json";

//MAIN RUNNER
const runner = async (xPath) => {
    console.log("running runner");
    const path = xPath;
    const read = await fs.readFile(path, "utf-8");
    const parse = JSON.parse(read);
    return parse;
};

// MAIN AUTHOR
const author = async (xPath, data) => {
    try {
        await fs.writeFile(xPath, JSON.stringify(data, null, 2));
        return { success: true, message: "File written successfully." };
    } catch (error) {
        console.error("Error occurred while writing to file:", error);
        if (error.code === "ENOENT") {
            throw new Error("The specified path does not exist.");
        } else if (error.code === "EACCES") {
            throw new Error("Permission denied when trying to write to the file.");
        } else {
            throw new Error(
                "An unexpected error occurred while writing to the file."
            );
        }
    }
};

// MULTER STORAGE
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "file_storage/");
    },
    filename: async (req, file, cb) => {
        const originalName = path.parse(file.originalname).name;
        const extension = path.extname(file.originalname);
        let newFileName = originalName;
        let counter = 1;
        // Check if the file already exists
        let filePath = path.join("file_storage", file.originalname);
        try {
            while (true) {
                try {
                    await fs.access(filePath);
                    newFileName = `${originalName} (${counter})`;
                    filePath = path.join("file_storage", `${newFileName}${extension}`);
                    counter++;
                } catch (err) {
                    break;
                }
            }
            cb(null, `${newFileName}${extension}`);
        } catch (error) {
            cb(error);
        }
    },
});

const upload = multer({ storage: storage });

//MAIN RECORD CREATOR FUNCTION
app.post("/records", async (req, res) => {
    const data = req.body?.data;
    const key = req.body?.key;
    const insert = req.body?.insert;
    const path = req.body?.path;
    const command = req.body?.command;
    const dataset = await runner(`./data/${path}.json`);
    console.log("This is the dataset: ", dataset);

    //INNER UPDATE FUNCTION
    if (command.includes("update")) {
        const match = await Array.from(dataset).find((item) => item.id === key);

        if (match) {
            const firstmark = command.indexOf("_");
            const lastmark = command.lastIndexOf("_");
            const property = command.slice(firstmark + 1, lastmark).trim();
            const action = command.slice(lastmark + 1);
            // console.log(command, firstmark, lastmark, property, action, insert);

            if (action !== "single") {
                if (!(property in match) || match[property] === undefined) {
                    match[property] = [];
                }
                match[property].push(insert);
            } else {
                match[property] = insert;
            }

            await handleStageCheck(path, match);

            match.metadata.modifiedAt = await generateRecordDateTime();
            await author(path, dataset);
            return res.status(200).json({
                status: true,
                key: match.id,
                message: `Updated ${match.id} with new ${property} data: ${insert}`,
            });
        } else {
            return res.status(404).json({
                status: false,
                message: `No match found for id ${key}.`,
            });
        }
    } else if (command.includes("replace")) {
        console.log("replace");
        console.log(key, path);
        const match = await Array.from(dataset).find((item) => item.id === key);
        if (match) {
            Object.assign(match, data);
        }

        await handleStageCheck(path, match);
        match.metadata.modifiedAt = await generateRecordDateTime();
        await author(path, dataset);
        console.log("author called.");

        return res.status(200).json({
            status: true,
            key: match.id,
            data: match,
            message: `Updated ${match.id} with contents from the formdata`,
        });
    } else if (command === "archive") {
        try {
            const archive = await runner(archivePath);
            const selection = dataset.find((item) => item.id === key);

            if (!selection) {
                return res
                    .status(404)
                    .json({ message: `${key} was not found`, status: false });
            }

            archive.push(selection);
            await author(archivePath, archive);

            const updated = dataset.filter((item) => item.id !== key);

            await author(path, updated);
            res.status(200).json({
                message: "Item archived successfully",
                status: true,
                data: selection,
            });
        } catch (error) {
            console.error("Error archiving item:", error);
            res
                .status(500)
                .json({ message: "An error occurred while archiving", status: false });
        }
    } else {
        console.log("create ", data);

        const match = dataset.find((item) => item.email === data.email);

        if (match) {
            console.log("match found");
            return res.status(200).json({
                status: true,
                message: `${data.email} is already registered`,
            });
        }

        data.id = generateRecordId(path, data);

        console.log(data.id);
        //GENERATES RECORD ID
        data["metadata"] = {
            createdAt: await generateRecordDate(),
            modifiedAt: await generateRecordDateTime(),
        };

        try {
            // console.log(dataset);
            console.log(data);
            dataset.push(data);
            await author(`./data/${path}.json`, dataset);
            return res.status(200).json({
                key: data.id,
                data: data,
                status: true,
                message: "Success!",
            });
        } catch (error) {
            console.log(error);
        }
    }
});

app.post("/registration-config", upload.single('image'), async (req, res) => {
    try {
        const table_name = "registration_config";
        const data = req.body

        // EDIT MODE
        if (data.id) {
            const existing = await dbService.findById(table_name, data.id);
            if (!existing) {
                return res.status(404).json({ status: false, message: "Record not found" });
            }

            // Check duplicate
            const duplicate_record = await dbService.findByColumn(table_name, "page", data.page);
            if (duplicate_record && duplicate_record.id !== existing.id) {
                return res.status(400).json({ status: false, message: "A duplicate record with the same page URL was found." });
            }

            if (req.file) {
                data.image = req.file.filename;
            }
            // Update record (registration_code should not change if not re-generated)
            const updated = await dbService.update(table_name, data.id, {
                ...data,
                modifiedAt: new Date().toISOString(),
            });
            return res.json({ status: true, message: "Record updated successfully", data: updated });
        }

        // Check duplicate
        const duplicate_record = await dbService.any(table_name, "page", data.page);
        if (duplicate_record > 0) {
            return res.status(400).json({ status: false, message: "Duplicate record found." });
        }


        if (req.file) {
            data.image = String(req.file.filename);
        }

        data.registration_code = generateRecordId(data.page, -4, false);
        const insert_data = await dbService.create(table_name, data);

        res.json({ status: true, message: "Data saved successfully", insert_data });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

app.post("/registration-config/switch-registration-lock", upload.single('none'), async (req, res) => {
    try {
        const table_name = "registration_config";
        const { Image, ...data } = req.body;

        const id = data.id;

        // Check if the record exists
        const existing = await dbService.findById(table_name, id);
        if (!existing) {
            return res.status(404).json({ status: false, message: "Record not found" });
        }

        data.lockRegistration = String(!(data.lockRegistration === "true"));


        const updated = await dbService.update(table_name, id, {
            ...data,
            modifiedAt: new Date().toISOString(),
        });

        res.json({ status: true, message: "Data updated successfully", updated });
    } catch (error) {
        console.error("Edit error:", error);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

app.get("/registration-config", async (req, res) => {
    try {
        const table_name = "registration_config";
        const rows = await dbService.findAll(table_name);


        res.json({ status: true, message: "Data saved successfully", rows });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

app.post("/registration-config-access", upload.none(), async (req, res) => {
    try {

        const data = req.body;
        // Check duplicate
        const page_data = await dbService.findExact("registration_config", "registration_code", data.registration_code);
        if (!page_data) {
            return res.status(401).json({ status: false, message: "Invalid Authorization Code" });
        }

        await sendOtpToPhone(data.mobile_number, req, res, client);
        // await dbService.create("registration_client_access", data);

        return res.status(200).json({
            status: true,
            message: "Login Success",
            data: page_data,
            session: req.session,
        });


    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Server error" });
    }
});

app.post("/otp-check", upload.none(), async (req, res) => {
    try {
        const data = req.body;
        const otp = req.session.otp;
        const now = Date.now();
        if (Date.now() > req.session.otpExpires) {
            return res.status(401).json({ status: false, message: 'OTP has expired please try again' });
        }

        if (data.otp !== otp) {
            return res.status(401).json({
                status: false,
                message: "Invalid OTP code",
            });
        }

        const page_data = await dbService.findByColumn("registration_config", "registration_code", data.registration_code);

        delete data.otp;
        await dbService.create("registration_client_access", data);

        res.status(200).json({
            status: true,
            message: "Login Success",
            data: page_data
        });


    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Server error" });
    }
});

const sendOtpToPhone = async (mobile_number, req, res, twilioClient) => {
    if (!mobile_number) {
        return { status: false, code: 400, message: 'Mobile number required' };
    }

    if (req.session.otp) {
        delete req.session.otp;
        delete req.session.otpExpires;
    }

    const otp = generateOTP();
    req.session.otp = otp;
    req.session.otpExpires = Date.now() + 1 * 59 * 1000; // expires in 1 mins

    try {
        await twilioClient.messages.create({
            body: `Your OTP code is: ${otp}`,
            from: twilioPhone,
            to: `whatsapp:${mobile_number}`,
        });

        return { status: true, code: 200, message: 'OTP sent successfully' };
    } catch (error) {
        console.error("Failed to send OTP:", error.message);
        return { status: false, code: 500, message: 'Failed to send OTP' };
    }
};

app.post("/registration", upload.single('attachment_file'), async (req, res) => {
    try {
        const table_name = "registration";
        const data = req.body;
        const file = req.file; 

        // Max token doesn't mean anything for sending out documents like applying for Golden Adler Ward 
        if(!file){
            const max_token_value = await dbService.findExact("registration_config", "page", data.event);
            const count_token = await dbService.countExact(table_name, "phone", data.phone);
    
            // Convert to numbers
            const maxTokens = Number(max_token_value?.maxTokensPerGuest);
            const currentCount = Number(count_token.count);
    
            // Validate values
            if (isNaN(maxTokens) || isNaN(currentCount)) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid registration configuration or user data.",
                });
            }
    
            if (currentCount >= maxTokens) {
                return res.status(413).json({
                    status: false,
                    message: "You have reached the maximum number of registrations allowed for this event.",
                });
            }
        }


       

        // You can check if file was sent
        if (file) {
            data.attachment_file = file.originalname
        } 

        data.event_id = generateRecordId(data.event, false);
        const create_result = await dbService.createSafe(table_name, data);
        if(create_result.status){
            // Todo: send email
            // await generateQRWithText(request, path);
            // await forumRegisterSendEmail({ reqBody: request });
            return res.json({ status: true, message: "Your request has been successfully processed.", create_result });
        }

        return res.json({ status: false, message: create_result.error });

    } catch (error) {
        console.error("Edit error:", error);
        res.status(500).json({ status: false, message: "Server error" });
    }
});

app.get('/registration', async (req, res) => {
  try {
  
    const { filters, data } = await dbService.QuerySqlConverter(req.query, "registration");
    
    const total = await dbService.getTotalCount("registration", filters);

    return res.json({
      status: true,
      data,
      total
    });
    
  } catch (error) {
    console.error("Error in /registration:", error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
});

app.get('/registration-csv-data', async (req, res) => {
  try {
  
    const data = await dbService.findAll("registration");
    
    const csv = await exportTableAsCSV(data); // Await CSV generation

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=registration-data-${Date.now()}.csv`
    );

    res.send(csv); // Send the actual CSV string
    
  } catch (error) {
    console.error("Error in fetching data from sql server:", error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
});



//WILL FETCH AND RETURN ANY DATA
app.post("/data", async (req, res) => {
    const endpoint = req.body.endpoint;
    const key = req.body.key;
    // console.log(endpoint);

    try {
        const response = await fs.readFile(`./data/${endpoint}.json`, "utf-8");
        const data = JSON.parse(response);
        if (key) {
            console.log("searching for " + key + " in" + endpoint);
            let targetProperty;
            if (!endpoint.includes("lead_list") && !endpoint.includes("logs")) {
                targetProperty = "company_id";
            } else {
                targetProperty = "id";
            }

            console.log("/data looking for match");
            const matches = data.filter((item) => item[targetProperty] === key);
            console.log(matches);
            return res.json(matches);
        }
        return res.json(data);
    } catch (error) {
        console.error("Error reading the file:", error);
        return res.status(500).send("Internal error with Data API");
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Jack: I'm good on port ${PORT}`);
});
