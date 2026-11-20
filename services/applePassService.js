const express = require("express");
const path = require("path");

require('dotenv').config();

const { PKPass } = require("passkit-generator");
const fs = require("fs");
const { modelNameFor, passLabelFor, buildHeaderFields, buildMemberFields } = require("./memberPassLayout");

function slugToTitle(slug) {
    return slug
        .replace(/-/g, ' ')                // Replace dashes with spaces
        .replace(/\b\w/g, char => char.toUpperCase()); // Capitalize first letter of each word
}

function titleToSlug(title) {
  return title
    .toLowerCase()            // convert to lowercase
    .replace(/\s+/g, '-')     // replace spaces (or multiple spaces) with dashes
    .replace(/[^\w-]+/g, ''); // remove any non-alphanumeric characters except dash
}

const generateMemberPass = async (data) => {

    const event_page = titleToSlug(data.title);
    const { firstname, lastname, card_expiry_date, memberId, serial_number, partner } = data;
    const wwdrPath = path.join(__dirname, "../certs/AppleWWDRCAG4.pem");
    const signerCertPath = path.join(__dirname, "../certs/signerCert.pem");
    const signerKeyPath = path.join(__dirname, "../certs/signerKey.pem");



    const _date = new Date(card_expiry_date);
    const expirationDate = new Date(
        _date.getFullYear(),
        _date.getMonth(),
        _date.getDate(),
        _date.getHours(),
        _date.getMinutes(),
        _date.getSeconds()
    );


    // The partner decides the design: "GEC Family Membership" -> family_card.pass, others -> corporate_card.pass.
    const modelPath = path.join(process.cwd(), "models", modelNameFor(partner));
    if (!fs.existsSync(modelPath)) {
        // No fallback to the other design: a member must never get the wrong card silently.
        throw new Error(`Pass model not found: ${modelPath}. Build it with npm run wallet:apple.`);
    }
    const label = passLabelFor(partner); // header text (right end) and the Add-sheet heading

    // Load pass template
    const pass = await PKPass.from({
        model: modelPath,
        certificates: {
            wwdr: fs.readFileSync(wwdrPath),
            signerCert: fs.readFileSync(signerCertPath),
            signerKey: fs.readFileSync(signerKeyPath),
            signerKeyPassphrase: process.env.APPLE_PASS_SIGNER_KEY_PASSPHRASE || "germany"
        }
    }, {
        serialNumber: `${serial_number}`,
        description: label,   // 👈 overrides pass.json
        // Nothing beside the logo: the label is a header field at the right end (below). The model's own
        // logoText must be replaced, and the library rejects an empty string, so a single space is used.
        logoText: " ", // 👈 overrides pass.json
    });

    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const formattedDate = expirationDate.toLocaleDateString('en-GB', options).replace(/\//g, '-');
    // Layout: the label at the right end of the header; nothing over the icon strip;
    // Expiry Date, Member ID and Name in one row.
    buildHeaderFields(partner).forEach((f) => pass.headerFields.push(f));
    const fields = buildMemberFields({ firstname, lastname, memberId, expiry: formattedDate });
    fields.primaryFields.forEach((f) => pass.primaryFields.push(f));
    fields.secondaryFields.forEach((f) => pass.secondaryFields.push(f));
    fields.auxiliaryFields.forEach((f) => pass.auxiliaryFields.push(f));
    // Add QR code at the bottom of the pass
    const qeValue = `${process.env.CLIENT_ORIGIN}/guest-registration/${event_page}?guest-code=${serial_number}`;

    pass.setBarcodes(qeValue);

    pass.setExpirationDate(expirationDate);

    const _buffer = pass.getAsBuffer();
    const passPath = path.join("pass_storage", `${event_page}`);

    // Create folder if it doesn't exist
    if (!fs.existsSync(passPath)) {
        fs.mkdirSync(passPath, { recursive: true });
    }

    fs.writeFileSync(`${passPath}/${serial_number}.pkpass`, _buffer);
    
};

const generateApplePass = async (data) => {

    
    const title = slugToTitle(data.title);
    const event_page = titleToSlug(data.title);
    const { firstName, lastName, event_id, event_date, partner } = data;
    const wwdrPath = path.join(__dirname, "../certs/AppleWWDRCAG4.pem");
    const signerCertPath = path.join(__dirname, "../certs/signerCert.pem");
    const signerKeyPath = path.join(__dirname, "../certs/signerKey.pem");



    const _date = new Date(event_date);
    const expirationDate = new Date(
        _date.getFullYear(),
        _date.getMonth(),
        _date.getDate() + 1,
        _date.getHours(),
        _date.getMinutes(),
        _date.getSeconds()
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
    }, {
        serialNumber: `${event_id}`,
        description: `${title}`,   // 👈 overrides pass.json
        logoText: "German Emirates Club", // 👈 overrides pass.json
    });

    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const formattedDate = expirationDate.toLocaleDateString('en-GB', options).replace(/\//g, '-');
    pass.secondaryFields.push({ key: "expiry", label: "Expiry Date", value: formattedDate });
    pass.primaryFields.push({ key: "event_name", label: "Event", "value": `${title}` });
    pass.auxiliaryFields.push({ key: "fullname", label: "Fullname", value: `${firstName} ${lastName}`, textAlignment: "PKTextAlignmentLeft" });
    
    // pass.auxiliaryFields.push({ key: "passid", label: "Pass ID", value: `${event_id}`, textAlignment: "PKTextAlignmentLeft" });
    // Add QR code at the bottom of the pass
    const qeValue = `${process.env.CLIENT_ORIGIN}/guest-registration/${event_page}?guest-code=${event_id}`;

    pass.setBarcodes(qeValue);

    pass.setExpirationDate(expirationDate);

    const _buffer = pass.getAsBuffer();
    const passPath = path.join(__dirname, "..", "pass_storage", `${event_page}`);

    // Create folder if it doesn't exist
    if (!fs.existsSync(passPath)) {
        fs.mkdirSync(passPath, { recursive: true });
    }

    fs.writeFileSync(`${passPath}/${event_id}.pkpass`, _buffer);
};

module.exports = { generateApplePass, generateMemberPass }