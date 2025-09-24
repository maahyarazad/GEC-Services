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
const {emailMembershipCard} = require("../services/emailService");
const fs = require("fs");

router.get("/membership-card",upload.none(),async (req, res) => {
  try {
    // const memberId = req.params.memberId;
    // const data = req.body;
    const data = {
      usrId: 18726817628712,
      title: "Mr",
first_name:"Maahyar",
name:"Azad",
cardnumber: "9187289173298",
event_name: "test"
    }
    const wwdrPath = path.join(__dirname, "../certs/AppleWWDRCAG4.pem");
    const signerCertPath = path.join(__dirname, "../certs/signerCert.pem");
    const signerKeyPath = path.join(__dirname, "../certs/signerKey.pem");

    const now = new Date();

  // Create a new date 12 months from now
  const expirationDate = new Date(
    now.getFullYear(),
    now.getMonth() + 12, // add 12 months
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds()
  );

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
    description: "VIP Membership Card",   // 👈 overrides pass.json
    logoText: "German Emirates Club VIP", // 👈 overrides pass.json
  });

    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const formattedDate = expirationDate.toLocaleDateString('en-GB', options).replace(/\//g, '-');
    pass.secondaryFields.push({ key: "expiry", label: "Expiry Date" ,value: formattedDate });
    pass.primaryFields.push({ key: "member", label: "Member ID", "value": `${data.usrId}` });
    pass.auxiliaryFields.push({ key: "fullname", label :"Fullname" ,value: `${data.title}${data.first_name}${data.name}`, textAlignment: "PKTextAlignmentLeft" });
    pass.auxiliaryFields.push({ key: "carnumber", label :"Card Number" ,value: `${data.cardnumber}`, textAlignment: "PKTextAlignmentLeft" });



    pass.setExpirationDate(expirationDate);

    const _buffer = pass.getAsBuffer();
    // const passPath = path.join(__dirname, "..", "pass_storage", `${data.event_name}`);
    const passPath = path.join(__dirname, "..", "pass_storage", `wirtschaftswunder-middle-east-wachstum-und-profitabilitat-fur-ihr-unternehmen-the`, 'gec-wmewupfiut-17587164361981941.pkpass');

    
    // // Create folder if it doesn't exist
    // if (!fs.existsSync(passPath)) {
    //   fs.mkdirSync(passPath, { recursive: true });
    // }
    
    // fs.writeFileSync("MyVirtualCard.pkpass", _buffer);
    const buffer = fs.readFileSync(passPath);

    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="MyVirtualCard.pkpass"`
    );
    res.send(buffer); 

  // await emailMembershipCard({
  //     email: "maahyarazad@gmail.com",                // recipient email
  //     memberName: `${data.title} ${data.first_name} ${data.name}`, // full name
  //     cardNumber: data.cardnumber,      // card number
  //     expiryDate: formattedDate,        // formatted expiry date
  //     membershipTier: "membership"      // optional: package or membership tier
  // }, buffer);

    // res.status(201).send("Success");
    

  } catch (err) {
    console.error("Error generating pass:", err);
    res.status(500).send("Error creating pass");
  }
});

module.exports = router;