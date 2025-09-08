const express = require("express");
const router = express.Router();
const path = require("path");
const dbService = require("../services/dbService");
require('dotenv').config();
const multer = require("multer");
const {PKPass} = require("passkit-generator");
const upload = multer({
    storage: multer.memoryStorage()
    , limits: { fileSize: 5 * 1024 * 1024 }
}); // 5MB max

const fs = require("fs");

router.get("/membership-card/:memberId",upload.none(),async (req, res) => {
  try {
    const memberId = req.params.memberId;
    const wwdrPath = path.join(__dirname, "../certs/AppleWWDRCAG4.pem");
    const signerCertPath = path.join(__dirname, "../certs/signerCert.pem");
    const signerKeyPath = path.join(__dirname, "../certs/signerKey.pem");

    

    // Load pass template
    const pass = await PKPass.from({
      model: path.join(process.cwd(), "models/membership.pass"),
      certificates: {
        wwdr: fs.readFileSync(wwdrPath),
        signerCert: fs.readFileSync(signerCertPath),
        signerKey: fs.readFileSync(signerKeyPath),
        signerKeyPassphrase: process.env.APPLE_PASS_SIGNER_KEY_PASSPHRASE || "germany"
      }
    },{
    serialNumber: "AAGH44625236dddaffbda",
  });

  pass.secondaryFields.push({ key: "expiry", label: "Expiry Date" ,value: "2025-12-31" });
  pass.primaryFields.push({ key: "member", label: "Member ID", "value": "123456789" });
  pass.auxiliaryFields.push({ key: "club", label :"German Emirates Club" ,value: "Active Membership" });



pass.setExpirationDate(new Date("2025-12-31"));

    const buffer = await pass.getAsBuffer();
    // const passPath = path.join(process.cwd(),"routes" ,"MyCard.pkpass");
    // const buffer = fs.readFileSync(passPath);
    // fs.writeFileSync("MyVirtualCard.pkpass", buffer);
    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="MyCard.pkpass"`
    );


    res.send(buffer); //`

    

  } catch (err) {
    console.error("Error generating pass:", err);
    res.status(500).send("Error creating pass");
  }
});

module.exports = router;