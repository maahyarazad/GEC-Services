const path = require("path");

require('dotenv').config();

const fs = require("fs");
const { getPool } = require("./workerPool");

const CERT_PATHS = {
    wwdr: path.join(__dirname, "../certs/AppleWWDRCAG4.pem"),
    signerCert: path.join(__dirname, "../certs/signerCert.pem"),
    signerKey: path.join(__dirname, "../certs/signerKey.pem"),
};

const MODEL_PATH = path.join(__dirname, "..", "models/membership.pass");
const PASS_STORAGE = path.join(__dirname, "..", "pass_storage");

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

function formatExpiry(expirationDate) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return expirationDate.toLocaleDateString('en-GB', options).replace(/\//g, '-');
}

/**
 * Sign the pass in the worker pool and write the resulting bundle.
 * Signing is CPU-bound; the write stays here so path layout is owned by one module.
 */
async function buildAndWritePass(passData, passPath, fileName) {

    const buffer = await getPool('pass').exec('buildApplePass', [
        passData,
        MODEL_PATH,
        CERT_PATHS,
        process.env.APPLE_PASS_SIGNER_KEY_PASSPHRASE || "germany",
    ]);

    if (!fs.existsSync(passPath)) {
        fs.mkdirSync(passPath, { recursive: true });
    }

    fs.writeFileSync(path.join(passPath, fileName), buffer);
}

const generateMemberPass = async (data) => {

    const title = slugToTitle(data.title);
    const event_page = titleToSlug(data.title);
    const { firstname, lastname, event_id, card_expiry_date, memberId, serial_number, partner } = data;

    const _date = new Date(card_expiry_date);
    const expirationDate = new Date(
        _date.getFullYear(),
        _date.getMonth(),
        _date.getDate(),
        _date.getHours(),
        _date.getMinutes(),
        _date.getSeconds()
    );

    const qeValue = `${process.env.CLIENT_ORIGIN}/guest-registration/${event_page}?guest-code=${serial_number}`;

    await buildAndWritePass(
        {
            props: {
                serialNumber: `${serial_number}`,
                description: `${title}`,   // 👈 overrides pass.json
                logoText: `${title}`, // 👈 overrides pass.json
            },
            secondaryFields: [
                { key: "expiry", label: "Expiry Date", value: formatExpiry(expirationDate) },
            ],
            primaryFields: [
                { key: "event_name", label: "Name", value: `${firstname} ${lastname}` },
            ],
            auxiliaryFields: [
                { key: "fullname", label: "Member ID", value: `${memberId}`, textAlignment: "PKTextAlignmentLeft" },
                { key: "partner", label: "Corporate Partner", value: `${partner}`, textAlignment: "PKTextAlignmentRight" },
            ],
            barcodeValue: qeValue,
            expirationDate: expirationDate.toISOString(),
        },
        path.join(PASS_STORAGE, `${event_page}`),
        `${serial_number}.pkpass`
    );
};

const generateApplePass = async (data) => {

    const title = slugToTitle(data.title);
    const event_page = titleToSlug(data.title);
    const { firstName, lastName, event_id, event_date, partner } = data;

    const _date = new Date(event_date);
    const expirationDate = new Date(
        _date.getFullYear(),
        _date.getMonth(),
        _date.getDate() + 1,
        _date.getHours(),
        _date.getMinutes(),
        _date.getSeconds()
    );

    const qeValue = `${process.env.CLIENT_ORIGIN}/guest-registration/${event_page}?guest-code=${event_id}`;

    await buildAndWritePass(
        {
            props: {
                serialNumber: `${event_id}`,
                description: `${title}`,   // 👈 overrides pass.json
                logoText: "German Emirates Club", // 👈 overrides pass.json
            },
            secondaryFields: [
                { key: "expiry", label: "Expiry Date", value: formatExpiry(expirationDate) },
            ],
            primaryFields: [
                { key: "event_name", label: "Event", value: `${title}` },
            ],
            auxiliaryFields: [
                { key: "fullname", label: "Fullname", value: `${firstName} ${lastName}`, textAlignment: "PKTextAlignmentLeft" },
            ],
            barcodeValue: qeValue,
            expirationDate: expirationDate.toISOString(),
        },
        path.join(PASS_STORAGE, `${event_page}`),
        `${event_id}.pkpass`
    );
};

module.exports = { generateApplePass, generateMemberPass }
