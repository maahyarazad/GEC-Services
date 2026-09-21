// invoiceService.js
//
// pdfkit rendering is synchronous CPU work and sits in the payment confirmation
// path, so it runs in a worker pool. This module keeps ownership of the
// filesystem layout: it resolves asset paths, computes the destination and
// writes the buffer the worker returns.

const fs = require("fs");
const path = require("path");
const { getPool } = require("./workerPool");

const LOGO_PATH = path.join(__dirname, "..", "file_storage", "gec-logo.png");

const generateInvoice = async (data) => {
    try {
        const folderPath = path.join(__dirname, "..", "invoice_storage", `${data.invoice_data.registeredForEvent}`);

        // Create folder if it doesn't exist
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        const { buffer, invoice_number } = await getPool('pdf').exec('renderInvoicePDF', [
            data.invoice_data,
            data.payment_data,
            { logoPath: LOGO_PATH },
        ]);

        const outputPath = path.join(folderPath, `INVOICE-${invoice_number}.pdf`);

        fs.writeFileSync(outputPath, buffer);

        console.log(`${Date.now()} - PDF written to`, outputPath);

    } catch (err) {
        console.error(`${Date.now()} - Error generating PDF:`, err);
        throw err;
    }

}


module.exports = { generateInvoice };
