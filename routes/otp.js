require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const { generateRecordId, generateOTP } = require("../services/generatorService");
const dbService = require("../services/dbService");
const {email_otp} = require("../services/emailService");
const twilioClient = require('twilio')(process.env.TWILIO_ACOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const smsglobal = require('smsglobal')(process.env.SMSGLOBAL_KEY, process.env.SMSGLOBAL_SECRET);
const {generateInvoice} = require('../services/invoceService');
const path = require("path");


const otpRequestMap = new Map();
const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res, next, options) => {
    const key = req.ip; // or use req.body.phone/email for per-user tracking
    const now = Date.now();
    const lastRequestTime = otpRequestMap.get(key) || 0;
    const elapsed = now - lastRequestTime;

    if (elapsed < 60000) {
      return res.status(429).json({
        status: 429,
        error: `You can only request one OTP per minute. Please wait ${Math.floor((60000-elapsed)/1000)} seconds before trying again.`
      });
    }

    
    // Update last request timestamp and allow the request
    next(); // continue to your route
  }
});



const multer = require("multer");
const { config } = require('dotenv');
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


const sendOtpToEmail = async (data, req, res) => {
    if (!data.email) {
        return { status: false, code: 400, message: 'Email is required' };
    }

    if (req.session.otp) {
        delete req.session.otp;
        delete req.session.otpExpires;
    }

    const otp = generateOTP();
    data.otp = otp;
    req.session.otp = otp;
    req.session.otpExpires = Date.now() + 1 * 59 * 1000; // expires in 1 mins

    try {

        generateInvoice();
        // await email_otp(data)

        return { status: true, code: 200, message: 'OTP sent successfully' };
    } catch (error) {
        console.error("Failed to send OTP:", error.message);
        return { status: false, code: 500, message: 'Failed to send OTP' };
    }
};


const sendOtpToPhone = async (data, req, res) => {
    if (!data.phone) {
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
        // await twilioClient.messages.create({
        //     body: `Your OTP code is: ${otp}`,
        //     from: process.env.TWILIO_PHONE  ,
        //     to: `whatsapp:${mobile_number}`,
        // });

        var payload = {
            origin: 'RegistrationApp',
            message: `{*${otp}*} is your verification code.`,
            destination: `${data.phone}`
        };

            // {*code*} placeholder is mandatory and will be replaced by an auto generated numeric code.

            const response = await smsglobal.otp.send(payload);


        return { status: true, code: 200, message: 'OTP sent successfully' };
    } catch (error) {
        console.error("Failed to send OTP:", error.message);
        return { status: false, code: 500, message: 'Failed to send OTP' };
    }
};

router.post("/send-otp",otpLimiter, upload.none() ,async (req, res) => {
    try {
        const data = req.body;
        const key = req.ip; // or use req.body.phone/email for per-user tracking
        const now = Date.now();
        otpRequestMap.set(key, now);
    //    const response = await sendOtpToPhone(data.whatsapp, req, res);
       const response = await sendOtpToEmail(data, req, res);
       
       if(response.status){
           return res.status(200).json({
               status: true,
               message: "Login Success",
               // data: data.page_data,
               session: req.session,
           });
       }else{
        return res.status(response.code).json({
               status: false,
               message: response.message,
           });
       }


    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: error.message });
    }
});

router.post("/otp-check",upload.none(), async (req, res) => {
    try {
        const data = req.body;
        const otp = req.session.otp;
        
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
            message: "Verification successful",
            data: page_data
        });


    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Server error" });
    }
});


module.exports = router;