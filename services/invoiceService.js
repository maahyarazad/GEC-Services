const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const generateInvoice = async (data) => {
    try {
        const doc = new PDFDocument({ margin: 50 });
        // Pipe to file
        const isoDate = data.payment_data.timestamp;
        const date = new Date(isoDate);
        
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0"); // months are 0-based
        const year = String(date.getFullYear()).slice(-2);
        
        const formattedDate = `${day}.${month}.${year}`;
        
        const invoice_number = `GWC-${day}${month}-${date.getFullYear()}-${data.payment_data.id.slice(data.payment_data.id.length - 4, data.payment_data.id.length)}`
        const folderPath = path.join(__dirname, "..", "invoice_storage", `${data.invoice_data.registeredForEvent}`);

        // Create folder if it doesn't exist
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        const outputPath = path.join(folderPath, `INVOICE-${invoice_number}.pdf`);
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);
        doc.lineWidth(0.5);
        // =====================
        // HEADER
        // =====================
        // Company Logo (replace with path)
        const file = path.join(__dirname, "..", "file_storage", "gec-logo.png")
        // Define positions
        const margin = 50;
        const pageWidth = doc.page.width - margin * 2;
        const logoWidth = 60;
        const logoY = 20;

        // Add logo on the left
        doc.image(file, margin, logoY, { width: logoWidth });

        // Add INVOICE text on the right
        doc.fontSize(20).fillColor("gray")
            .font("Times-Roman")
            .text("INVOICE", doc.page.width - margin - 150, logoY + 20, {
                width: 150,
                align: "right"
            });



        const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

        // Draw background
        doc.rect(margin, doc.y, pageWidth, 20).fill("#eaeaea");

        // Draw text on top
        doc.fillColor("black").font("Times-Bold").fontSize(12)
            .text("BILL TO", margin, doc.y + 5, {
                lineGap: 5 // tweak this to visually center text
            }); // add small padding inside rect

        // Maahyar CM: I am so lazy and don't want to change the database, so I used this key value to fetch company name!!!
        if (data.payment_data.billingAddress.address2 === "") {
            doc.font("Times-Roman").fontSize(11)
                .text(`${capitalize(data.invoice_data.firstName)} ${capitalize(data.invoice_data.lastName)}`, { x: margin + 5 });


        } else {
            doc.font("Times-Bold").fontSize(11)
                .text(`${capitalize(data.payment_data.billingAddress.address2)}`, { x: margin + 5, continued: false });

            doc.font("Times-Roman").fontSize(11)
                .text(`${capitalize(data.invoice_data.firstName)} ${capitalize(data.invoice_data.lastName)}`, { x: margin + 5 });

        }



        // =====================
        // MAIN INVOICE TABLE (Dynamic Row Height)
        // =====================
        doc.moveDown(4);
        let baseRowHeight = 28; // min height for short rows

        let headers = [
            "Customer Number",
            "Date",
            "Invoice Number",

        ];

        // ------------------
        // Draw Header
        // ------------------

        // Optional: define relative widths (percentages)
        let colPercents = [0.35, 0.25, 0.40]; // must sum <= 1

        // Compute actual widths based on page width
        let totalWidth = pageWidth * 1;
        let cols = colPercents.map(p => p * totalWidth);

        // Draw header
        let x = margin;
        let headerY = doc.y;
        headers.forEach((header, i) => {
            // Draw background
            doc.rect(x, headerY, cols[i], baseRowHeight).fillAndStroke("#eaeaea", "#000");

            // Draw text
            doc.fillColor("black").font("Times-Roman").fontSize(9)
                .text(header, x + 5, headerY + 7, {
                    width: cols[i] - 10,
                    align: "left"
                });

            x += cols[i];
        });



        // Move y-position for the first row dynamically
        doc.y = headerY + baseRowHeight;

        // ------------------
        // Dynamic Rows
        // ------------------
        let currentY = doc.y;




        // Example dynamic dataset
        let rows = [
            [
                `${data.payment_data.id}`, `${formattedDate}`, `${invoice_number}`
            ],
        ];

        rows.forEach((row) => {
            // Calculate the height needed for each cell in this row
            const cellHeights = row.map((val, i) =>
                doc.heightOfString(val, {
                    width: cols[i] - 10, // account for padding
                    align: i === 0 ? "left" : "right"
                })
            );

            const rowHeight = Math.max(...cellHeights, baseRowHeight);

            // Draw cells
            let x = 50;
            row.forEach((val, i) => {
                doc.rect(x, currentY, cols[i], rowHeight).stroke();
                doc.fillColor("black").font("Times-Roman").fontSize(8)
                    .text(val, x + 5, currentY + 7, {
                        width: cols[i] - 10,
                        align: i === 0 ? "left" : "right"
                    });
                x += cols[i];
            });

            // Move Y position for next row
            currentY += rowHeight;
        });


        // =====================
        // MAIN INVOICE TABLE (Dynamic Row Height)
        // =====================
        doc.moveDown(4);
        baseRowHeight = 28; // min height for short rows

        headers = [
            "Description",
            // "Period",
            `Net Rate (${data.payment_data.currency})`,
            "Unit",
            `Net Amount (${data.payment_data.currency})`,
            `Tax${data.payment_data.currency === "AED" ? "(5%)" : ""}`,
            `Total Gross (${data.payment_data.currency})`
        ];

        // ------------------
        // Draw Header
        // ------------------

        // Optional: define relative widths (percentages)
        colPercents = [0.40, 0.12, 0.06, 0.15, 0.1, 0.17]; // must sum <= 1

        // Compute actual widths based on page width
        totalWidth = pageWidth * 1;
        cols = colPercents.map(p => p * totalWidth);

        // Draw header
        x = margin;
        headerY = doc.y;
        headers.forEach((header, i) => {
            // Draw background
            doc.rect(x, headerY, cols[i], baseRowHeight).fillAndStroke("#eaeaea", "#000");

            // Draw text
            doc.fillColor("black").font("Times-Roman").fontSize(9)
                .text(header, x + 5, headerY + 7, {
                    width: cols[i] - 10,
                    align: i === 0 ? "left" : "right"
                });

            x += cols[i];
        });



        // Move y-position for the first row dynamically
        doc.y = headerY + baseRowHeight;

        // ------------------
        // Dynamic Rows
        // ------------------
        currentY = doc.y;

        // Example dynamic dataset
        rows = [
            [
                `${data.invoice_data.recordType} - ${data.invoice_data.registeredForEvent}`,
                // "01.01.2025 to 01.01.2026",
                `${data.payment_data.amount}.00`,
                "1",
                `${data.payment_data.currency === "AED" ? data.invoice_data.recordFee : "0"}.00`,
                `${data.payment_data.currency === "AED" ? Math.round(data.invoice_data.recordFee * 0.05) : "0"}.00`,
                `${data.payment_data.amount}.00`
            ]
        ];

        rows.forEach((row) => {
            // Calculate the height needed for each cell in this row
            const cellHeights = row.map((val, i) =>
                doc.heightOfString(val, {
                    width: cols[i] - 10, // account for padding
                    align: i === 0 ? "left" : "right"
                })
            );

            const rowHeight = Math.max(...cellHeights, baseRowHeight);

            // Draw cells
            let x = 50;
            row.forEach((val, i) => {
                doc.rect(x, currentY, cols[i], rowHeight).stroke();
                doc.fillColor("black").font("Times-Roman").fontSize(8)
                    .text(val, x + 5, currentY + 7, {
                        width: cols[i] - 10,
                        align: i === 0 ? "left" : "right"
                    });
                x += cols[i];
            });

            // Move Y position for next row
            currentY += rowHeight;
        });



        // =====================
        // PAYMENT TERMS
        // =====================
        doc.moveDown(4);
        doc.rect(margin, doc.y, pageWidth, 20).fill("#eaeaea");

        // Draw text on top
        doc.fillColor("black").font("Times-Roman").fontSize(12)
            .text("PAYMENT TERMS", margin, doc.y + 5, {
                lineGap: 5 // tweak this to visually center text
            }); // add small padding inside rect



        doc.font("Times-Roman").fontSize(11).text(
            "The invoice is due on receipt. Kindly issue a cheque after receiving this invoice or pay via bank transfer to (in case of bank transfer please send a payment avis):",
            { width: 500 }
        );

        doc.moveDown();
        doc.text("Pay to order of: German World Club FZCO");
        doc.text("Bank Name: WIO Bank");
        doc.text("Account Number: 9984546965");
        doc.text("Swift Code: WIOBAEADXXX");
        doc.text("IBAN: AE100860000009984546965");
        doc.text("Bank Branch: Etihad Airways Centre");
        doc.text("Company: German World Club FZCO");

        // =====================
        // FOOTER
        // =====================
        doc.moveDown(4);

        const footerY = doc.page.height - 100; // 50px from bottom
        const footerStyle = {
            width:  doc.page.width,
            align: "center"
        };
        doc.fontSize(10).font("Times-Roman").fillColor("gray")
            .text("GERMAN WORLD CLUB FZCO", 0, footerY, footerStyle)
            .text("Dubai Silicon Oasis • Digital Park • Building A2", footerStyle)
            .text("Dubai • United Arab Emirates", footerStyle)


        doc.end();

        await new Promise((resolve, reject) => {
            stream.on("finish", resolve);
            stream.on("error", reject);
        });

        console.log("PDF written to", outputPath);

    } catch (err) {
        console.error("Error generating PDF:", err);
        throw err;
    }

}


module.exports = { generateInvoice };