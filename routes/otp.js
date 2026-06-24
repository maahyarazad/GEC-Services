require("dotenv").config();
const express = require("express");
const rateLimit = require("express-rate-limit");
const { getPool } = require('../services/mysqlService');
const router = express.Router();
const {
  generateRecordId,
  generateOTP,
} = require("../services/generatorService");
const dbService = require("../services/dbService");
const { email_otp } = require("../services/emailService");
const twilioClient = require("twilio")(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const smsglobal = require("smsglobal")(
  process.env.SMSGLOBAL_KEY,
  process.env.SMSGLOBAL_SECRET
);
const jwt = require("jsonwebtoken");

const otpRequestMap = new Map(); // For email OTPs
const otpMobileRequestMap = new Map(); // For mobile OTPs

function set_limiter_map(req) {
  const now = Date.now();
  const isMobile = !!req.body.mobile_number; // check if it's a mobile OTP
  const key = isMobile ? req.body.mobile_number : req.body.email || req.ip;

  // Pick correct map
  const map = isMobile ? otpMobileRequestMap : otpRequestMap;
  map.set(key, now);
}

// Run cleanup every 4 minutes
setInterval(() => {
  const now = Date.now();
  const maps = [otpRequestMap, otpMobileRequestMap];

  for (const map of maps) {
    for (const [key, lastTime] of map.entries()) {
      if (now - lastTime > 4 * 60 * 1000) {
        map.delete(key);
      }
    }
  }
}, 4 * 60 * 1000);

const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res, next, options) => {
    const now = Date.now();
    const isMobile = !!req.body.mobile_number; // check if it's a mobile OTP
    const key = isMobile ? req.body.mobile_number : req.body.email || req.ip;

    // Pick correct map
    const map = isMobile ? otpMobileRequestMap : otpRequestMap;
    const lastRequestTime = map.get(key) || 0;
    const elapsed = now - lastRequestTime;

    if (elapsed < 60000) {
      return res.status(429).json({
        status: 429,
        error: `You can only request one OTP per minute. Please wait ${Math.floor(
          (60000 - elapsed) / 1000
        )} seconds before trying again.`,
      });
    }

    // Automatically remove key after 60 seconds to prevent memory buildup
    setTimeout(() => {
      map.delete(key);
    }, 60 * 1000);

    next();
  },
});

const sendOtpToEmail = async (data, req, res) => {
  if (!data.email) {
    return { status: false, code: 400, message: "Email is required" };
  }

  if (req.session.otp) {
    delete req.session.otp;
    delete req.session.otpExpires;
  }

  const otp = generateOTP();
  data.otp = otp;
  req.session.otp = otp;
  req.session.otpExpires = Date.now() + 5 * 59 * 1000; // expires in 5 mins

  try {
    if (process.env.ENVIRONMENT === "PRODUCTION") {
        await email_otp(data);
    }

    return { status: true, code: 200, message: "OTP sent successfully" };
  } catch (error) {
    console.error("Failed to send OTP:", error.message);
    return { status: false, code: 500, message: "Failed to send OTP" };
  }
};

router.post("/send-otp", otpLimiter, async (req, res) => {
  try {
    set_limiter_map(req);

    const { event, email } = req.body;

    if (event === "Partner Onboarding Authentication") {
      return await handlePartnerOtp(req, res);
    }

    return await handleStandardOtp(req, res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: error.message });
  }
});

// --- Handlers ---

async function handlePartnerOtp(req, res) {
  const { email } = req.body;

  const partnerData = await fetchPartnerFromGEC(email);
  if (!partnerData?.length) {
    return res.status(400).json({
      status: false,
      message: `${email} is not active in our system - if you think this is a mistake, please contact us`,
    });
  }

  return await sendOtpResponse(req, res, { includeLoginMessage: false });
  
}

async function handleStandardOtp(req, res) {
  return await sendOtpResponse(req, res, { includeLoginMessage: true });
}

// --- Shared OTP sender ---

async function sendOtpResponse(req, res, { includeLoginMessage }) {
  const response = await sendOtpToEmail(req.body, req, res);

  if (response.status) {
    return res.status(200).json({
      status: true,
      ...(includeLoginMessage && { message: "Login Success" }),
      session: req.session,
    });
  }

  return res.status(response.code).json({
    status: false,
    message: response.message,
  });
}

router.post("/send-otp-mobile", otpLimiter, async (req, res) => {
  try {
    set_limiter_map(req);
    const data = req.body;

    const { mobile_number, origin } = req.body;

    if (!mobile_number) {
      return res
        .status(400)
        .json({ status: false, message: "Mobile number is required" });
    }

    if (!origin) {
      return res
        .status(400)
        .json({ status: false, message: "Origin is required" });
    }
    // await twilioClient.messages.create({
    //     body: `Your OTP code is: ${otp}`,
    //     from: process.env.TWILIO_PHONE  ,
    //     to: `whatsapp:${mobile_number}`,
    // });

    var payload = {
      origin: "B P",
      // {*code*} placeholder is mandatory and will be replaced by an auto generated numeric code.
      message: `{*code*} is your ${data.origin} verification code. For your own security, please don't share it with others.`,
      destination: `+${data.mobile_number.replace(/\D/g, "")}`,
      length: 5,
      codeExpiry: 300,
    };

    if (process.env.ENVIRONMENT === "PRODUCTION") {
      const response = await smsglobal.otp.send(payload);
      res.status(200).json({
        status: true,
        message: "OTP sent successfully",
        data: response,
      });
    } else {
      res.status(200).json({
        status: true,
        message: "OTP sent successfully",
      });
    }
  } catch (error) {
    console.error("Failed to send OTP:", error.message);
    res.status(500).json({ status: false, message: "Failed to send OTP" });
  }
});

router.post("/otp-check", async (req, res) => {
  try {
    const data = req.body;
    const otp = req.session.otp;
    const page_data = dbService.findByColumn(
      "registration_config",
      "registration_code",
      data.registration_code
    );

    if (process.env.ENVIRONMENT === "PRODUCTION") {
      if (Date.now() > req.session.otpExpires) {
        return res
          .status(401)
          .json({ status: false, message: "OTP has expired please try again" });
      }

      if (data.otp !== otp) {
        return res.status(401).json({
          status: false,
          message: "Invalid OTP code",
        });
      }

      delete data.otp;

      if (Object.keys(data).length > 0)
        dbService.create("registration_client_access", data);

      res.status(200).json({
        status: true,
        message: "Verification successful",
        data: page_data,
      });
    } else {
      res.status(200).json({
        status: true,
        message: "Verification successful",
        data: page_data,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Server error" });
  }
});


const fetchPartnerFromGEC = async (email) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      ` SELECT wpc.firstName, wpc.email, wpc.partnerId, p.title, p.status
        FROM web_partner_contact wpc 
        LEFT JOIN web_partner AS p ON p.id = wpc.partnerId
        WHERE p.status = '1' AND LOWER(TRIM(wpc.email)) = LOWER(TRIM(?)) LIMIT 1`,
      email
    );
    return rows.length ? rows : [];
  } catch (err) {
    console.error("fetchPartnerFromGEC:", err);
  }
};


router.post("/partner-otp-check", async (req, res) => {
  try {
    const data = req.body;

    const partnerData = await fetchPartnerFromGEC(data.email);
    
    // ── 2. OTP validation (PRODUCTION only) ──────────────────────
    if (process.env.ENVIRONMENT === "PRODUCTION") {
      if (Date.now() > req.session.otpExpires) {
        return res
          .status(401)
          .json({
            status: false,
            message: "OTP has expired, please try again",
          });
      }

      if (data.otp !== req.session.otp) {
        return res
          .status(401)
          .json({ status: false, message: "Invalid OTP code" });
      }
    }

    // ── 3. Persist registration data ─────────────────────────────
    delete data.otp;
    data.mobile_number = data.email;
    delete data.email;
    if (Object.keys(data).length > 0) {
      dbService.create("registration_client_access", data);
    }

    
    // ── 4. Sign token & set cookie ───────────────────────────────
    const token = jwt.sign(
      { partner: partnerData[0] },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("partner-usr", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    return res.status(200).json({
      status: true,
      message: "Verification successful",
      data: { ...partnerData[0] },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Server error" });
  }
});

router.post("/otp-check-mobile", async (req, res) => {
  try {
    const data = req.body;

    const verifyOtp = () =>
      new Promise((resolve, reject) => {
        smsglobal.otp.verifyByRequestId(
          data.otp_data.data.requestId,
          data.otp,
          (error, response) => {
            // Some providers return both error + valid response
            if (response && response.statusCode === 200) {
              return resolve(response);
            }

            if (error) {
              console.error("OTP verification error:", error);
              return reject(error);
            }

            // Handle non-200 responses as failure
            return reject(new Error(response?.status || "Unknown error"));
          }
        );
      });

    // const response = await verifyOtp();

    // ✅ success
    return res.status(200).json({
      status: true,
      message: "Verification successful",
    });
  } catch (err) {
    console.error("OTP verification failed:", err);

    return res.status(401).json({
      status: false,
      message: err?.data || "OTP verification failed",
    });
  }
});

module.exports = router;
