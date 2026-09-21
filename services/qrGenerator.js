// qrGenerator.js
//
// QR encoding is synchronous CPU work, so it runs in a worker pool rather than
// on the event loop. This module keeps all I/O and configuration on the main
// thread: it resolves paths, creates directories and builds URLs, then hands the
// worker nothing but two strings.
//
// Two separate QR stores exist, deliberately — do not unify them:
//
//   qr-files/<event_page>/<code>.png   per-event registration QRs. Consumed by
//                                      routes/registration_config.js, routes/payment.js,
//                                      routes/external_route.js and services/emailService.js.
//
//   qr_files/<eventId>-<contactId>.png WhatsApp QRs. Served statically as /qr_codes
//                                      by server.js and read by routes/events.js.

require("dotenv").config();
const path = require('path');
const fs = require('fs');
const { getPool } = require('./workerPool');

const REGISTRATION_QR_DIR = path.join(__dirname, '..', 'qr-files');
const WHATSAPP_QR_DIR = path.join(__dirname, '..', 'qr_files');

/**
 * Generate the per-event registration QR code.
 *
 * @param {string} event_page - event page slug, used as the sub-directory
 * @param {string} code       - guest code, used as the filename
 */
async function generateQRWithText(event_page, code) {

    const tempPath = path.join(REGISTRATION_QR_DIR, `${event_page}`);

    if (!fs.existsSync(tempPath)) {
        fs.mkdirSync(tempPath, { recursive: true });
    }

    const filePath = path.join(tempPath, `${code}.png`);

    try {

        const qeValue = `${process.env.CLIENT_ORIGIN}/guest-registration/${event_page}?guest-code=${code}`;
        await getPool('qr').exec('generateAndSaveQR', [filePath, qeValue]);

    } catch (error) {
        console.error(`${Date.now()} - Error generating QR with text:`, error);
        throw error;
    }
}

/**
 * Generate the WhatsApp QR code for a contact/event pair.
 *
 * @param {number} contactId - contact_book_id
 * @param {number} eventId   - event_id
 * @returns {Promise<string>} the public URL of the generated PNG
 */
async function generateQR_WhatsApp(contactId, eventId) {

    if (!fs.existsSync(WHATSAPP_QR_DIR)) {
        fs.mkdirSync(WHATSAPP_QR_DIR, { recursive: true });
    }

    const filePath = path.join(WHATSAPP_QR_DIR, `${eventId}-${contactId}.png`);

    try {

        const qeValue = `${process.env.CLIENT_ORIGIN}/event-registration/contactId=${contactId}&eventId=${eventId}`;
        const filePathUrl = `https://services.german-emirates-club.com/qr_codes/${eventId}-${contactId}.png`;

        await getPool('qr').exec('generateAndSaveQR', [filePath, qeValue]);

        return filePathUrl;

    } catch (error) {
        console.error('Error generating QR with text:', error);
        throw error;
    }
}

/**
 * Check whether a QR code PNG has actually been generated for a contact/event
 * by looking for the file in `qr_files/`.
 *
 * Pure fs.existsSync — no CPU cost, so this stays on the main thread and never
 * touches the pool. It also must not create the directory: this is a read path.
 *
 * @param {number} contactId - contact_book_id
 * @param {number} eventId   - event_id
 * @returns {boolean} whether the QR image file exists
 */
async function check_generateQR_WhatsApp(contactId, eventId) {

    const filePath = path.join(WHATSAPP_QR_DIR, `${eventId}-${contactId}.png`);

    try {
        return fs.existsSync(filePath);
    } catch (error) {
        console.error('Error checking QR file:', error);
        return false;
    }
}

module.exports = { generateQRWithText, generateQR_WhatsApp, check_generateQR_WhatsApp };
