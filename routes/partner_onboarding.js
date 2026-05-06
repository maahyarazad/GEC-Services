
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const dbService = require("../services/dbService");
require("dotenv").config();
const multer = require("multer");
const authorization_middleware = require("../middleware/auth");
const { exportTableAsCSV } = require("../services/csvParser");
const { generateMemberPass } = require("../services/applePassService");
const { generateMemberGooglePass } = require("../services/googlePassService");
const { membership_pass_email } = require("../services/emailService");
const uniqid = require("uniqid");
const path = require("path");
const db = dbService.getDB();


router.post(
  "/partner-auto-login",
  async (req, res) => {
    try {
      
      const partnerToken = req.cookies["partner-usr"];
      if (!partnerToken) {
        return res.status(401).json({
          status: false,
          message: "No authentication token found. Please login.",
          user: null,
        });
      }

      const verifyToken = jwt.verify(partnerToken, process.env.JWT_SECRET);
         
      
          return res.status(200).json({
            status: true,
            message: "Verification successful",
            data: {...verifyToken.partner},
          });
    } catch (error) {
      res.status(500).json({ status: false, message: "Server error" });
    }
  }
);


module.exports = router;