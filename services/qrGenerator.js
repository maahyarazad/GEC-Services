// qrGenerator.js
const QRCode = require('qrcode');
require("dotenv").config();
const path = require('path');
const fs = require('fs');
const dbService = require('./dbService');

/**
 * Generate a QR code with embedded text over it.
 * @param {string} data - The data to encode in the QR code.
 */
async function generateQRWithText(event_page, code) {

    const tempPath = path.join(__dirname, '..','qr-files', `${event_page}`);

    if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath, { recursive: true });
    }

    const filePath = path.join(tempPath, `${code}.png`)
    try {

        const qeValue = `${process.env.CLIENT_ORIGIN}/guest-registration/${event_page}?guest-code=${code}`;
        await QRCode.toFile(filePath, qeValue);

    } catch (error) {
        console.error(`${Date.now()} - Error generating QR with text:`, error);
        throw error;
    }
}


/**
 * Generate a QR code with embedded text over it.
 * @param {string} data - The data to encode in the QR code.
 */
async function generateQR_WhatsApp(contactId, eventId) {

    const tempPath = path.join(__dirname, '..','qr_files');

    if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath, { recursive: true });
    }

    const filePath = path.join(tempPath, `${eventId}-${contactId}.png`)
    try {

        //http://localhost:5175/event-registration/contactId=1301&eventId=7
        const qeValue = `${process.env.CLIENT_ORIGIN}/event-registration/contactId=${contactId}&eventId=${eventId}`;
        const filePathUrl = `https://services.german-emirates-club.com/qr_codes/${eventId}-${contactId}.png`;
        await QRCode.toFile(filePath, qeValue);
        return filePathUrl;

    } catch (error) {
        console.error('Error generating QR with text:', error);
        throw error;
    }
}

/**
 * Check whether a QR code has already been generated for a contact/event by
 * looking for a matching row in `contact_book_events`. When a `contentSid` is
 * provided the check is scoped to that exact template, otherwise it returns
 * true if the contact has any QR record for the event.
 *
 * @param {number} contactId - contact_book_id
 * @param {number} eventId   - event_id
 * @param {string} [contentSid] - optional WhatsApp media template contentSid
 * @returns {boolean} whether a matching record exists
 */
async function check_generateQR_WhatsApp(contactId, eventId, contentSid) {
    try {
        const db = dbService.getDB();

        if (contentSid) {
            const row = db.prepare(
                `SELECT 1 FROM contact_book_events
                 WHERE contentSid = ? AND contact_book_id = ? AND event_id = ?
                 LIMIT 1`
            ).get(contentSid, contactId, eventId);
            return !!row;
        }

        const row = db.prepare(
            `SELECT 1 FROM contact_book_events
             WHERE contact_book_id = ? AND event_id = ?
             LIMIT 1`
        ).get(contactId, eventId);
        return !!row;
    } catch (error) {
        console.error('Error checking QR record:', error);
        return false;
    }
}


module.exports = { generateQRWithText, generateQR_WhatsApp, check_generateQR_WhatsApp };
