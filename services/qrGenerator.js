// qrGenerator.js
const QRCode = require('qrcode');
require("dotenv").config();
const path = require('path');
const fs = require('fs');

/**
 * Generate a QR code with embedded text over it.
 * @param {string} data - The data to encode in the QR code.
 */
async function generateQRWithText(event_page, code) {

    const tempPath = path.join(__dirname, '..',  'qr-files');
    if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath, { recursive: true });
    }

    const filePath = path.join(tempPath, `${code}.png`)
    try {

        const qeValue = `${process.env.CLIENT_ORIGIN}/guest-registration/${event_page}?guest-code=${code}`;
        await QRCode.toFile(filePath, qeValue);

    } catch (error) {
        console.error('Error generating QR with text:', error);
        throw error;
    }
}

module.exports = { generateQRWithText };
