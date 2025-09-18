const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const generateInvoice = () => {
    const doc = new PDFDocument({ margin: 50 });
    const outputPath = path.join(__dirname, "output.pdf");
    // Pipe to file
    doc.pipe(fs.createWriteStream(outputPath));
    doc.lineWidth(0.5);
    // =====================
    // HEADER
    // =====================
    // Company Logo (replace with path)
    const file = path.join(__dirname, "..", "file_storage", "gec-logo.png")
    // Define positions
    const margin = 50;
    const pageWidth = doc.page.width - margin*2;
    const logoWidth = 60;
    const logoY = 20;

    // Add logo on the left
    doc.image(file, margin, logoY, { width: logoWidth });

    // Add INVOICE text on the right
    doc.fontSize(20).fillColor("gray")
        .font("Helvetica-Bold")
        .text("INVOICE", doc.page.width - margin - 150, logoY + 20, {
            width: 150,
            align: "right"
        });





    // Draw background
    doc.rect(margin, doc.y, pageWidth, 20).fill("#eaeaea");
        
    // Draw text on top
    doc.fillColor("black").font("Helvetica-Bold").fontSize(12)
        .text("BILL TO", margin, doc.y + 5, {
            lineGap: 5 // tweak this to visually center text
        }); // add small padding inside rect

    doc.font("Helvetica").fontSize(11)
        .text("Marston-Domsel GmbH", { x: margin + 5, continued: false })
        .text("Attn: Martin Esser", { x: margin + 5 })
        .text("Bergheimer Str.15, 53909 Zulpich / Germany", { x: margin + 5 });



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
        doc.fillColor("black").font("Helvetica-Bold").fontSize(9)
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
            "PCS 23/12/24/001", "01.01.25", "GWC-0101-202523M"
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
            doc.fillColor("black").font("Helvetica").fontSize(8)
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
        "Period",
        "Net Rate (AED)",
        "Unit",
        "Net Amount (AED)",
        "Tax",
        "Total Gross (AED)"
    ];

    // ------------------
    // Draw Header
    // ------------------

    // Optional: define relative widths (percentages)
    colPercents = [0.25, 0.15, 0.12, 0.08, 0.15, 0.08, 0.17]; // must sum <= 1

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
        doc.fillColor("black").font("Helvetica-Bold").fontSize(9)
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
            "Annual Fee: Service as per 'Partner Cooperation Agreement'. This text is intentionally long so it wraps into multiple lines properly.",
            "01.01.2025 to 01.01.2026",
            "20,000.00",
            "1",
            "20,000.00",
            "0.00",
            "20,000.00"
        ],
        [
            "Another service with a shorter description",
            "02.01.2025 to 02.01.2026",
            "5,000.00",
            "2",
            "10,000.00",
            "0.00",
            "10,000.00"
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
            doc.fillColor("black").font("Helvetica").fontSize(8)
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
    doc.fillColor("black").font("Helvetica-Bold").fontSize(12)
        .text("PAYMENT TERMS", margin, doc.y + 5, {
            lineGap: 5 // tweak this to visually center text
        }); // add small padding inside rect



    doc.font("Helvetica").fontSize(11).text(
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
    doc.fontSize(10).font("Helvetica").fillColor("gray")
        .text("GERMAN WORLD CLUB FZCO", 0, footerY, { align: "center" })
        .text("Dubai Silicon Oasis • Digital Park • Building A2", { align: "center" })
        .text("Dubai • United Arab Emirates", { align: "center" })
        
    // doc.fontSize(10).fillColor("gray").text("© 2025 German World Club FZCO", { align: "center" });

    doc.end();
}


module.exports = { generateInvoice };