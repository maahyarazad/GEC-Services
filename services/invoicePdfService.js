// Invoice PDF generation via Puppeteer.
//
// Replaces the former @react-pdf/renderer flow: the invoice is rendered as an
// HTML document (mirroring the previous react-pdf layout/styling) and printed
// to PDF by a headless Chromium. A single browser instance is reused across
// requests to keep the live preview responsive.

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const BLUE = "#037bfc";
const ORANGE = "#d47e11";
const GRAY = "#A9A9A9";

// Page number, rendered by Chromium in the bottom margin of every page. The
// company footer itself lives in the body and is pinned to the last page.
const FOOTER_TEMPLATE = `
  <div style="width:100%;box-sizing:border-box;padding:0 0.55in;font-family:Helvetica,Arial,sans-serif;color:#000;text-align:right;font-size:9px;">
    Page <span class="pageNumber"></span> of <span class="totalPages"></span>
  </div>`;

// ── Shared browser instance ──────────────────────────────────────────────────
let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      // Use the system Chromium via CHROME_BIN when set (e.g. on the Linux
      // server); falls back to Puppeteer's bundled Chromium locally.
      executablePath: process.env.CHROME_BIN,
      headless: true,
      args: ["--no-sandbox"],
    });
  }
  const browser = await browserPromise;
  // Relaunch if Chromium crashed or was disconnected.
  if (!browser.connected) {
    browserPromise = null;
    return getBrowser();
  }
  return browser;
}

// ── Logo (inlined as a data URI so the page needs no network) ────────────────
const LOGO_PATH = path.join(
  __dirname,
  "..",
  "public",
  "src",
  "assets",
  "media",
  "bp-logo.png"
);

let logoDataUri = "";
try {
  logoDataUri = `data:image/png;base64,${fs
    .readFileSync(LOGO_PATH)
    .toString("base64")}`;
} catch (err) {
  console.warn(`Invoice logo not found at ${LOGO_PATH}:`, err.message);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const toNumber = (value) =>
  parseFloat(String(value ?? "").replace(/,/g, "")) || 0;

// ── HTML template (mirrors MyDocument.jsx / Styles.jsx) ──────────────────────
function buildInvoiceHtml(formData) {
  const project = formData.project || {};
  const company = formData.company || {};
  const reference = formData.reference || {};
  const bankDetail = formData.bank_detail || {};
  const paymentTerms = formData.payment_terms || {};
  const currency = formData.currency || {};
  const items = Array.isArray(formData.items) ? formData.items : [];

  const itemsPrice = !!formData.items_price;
  const currencyEnabled = !!currency.currency_enable;
  const symbol = esc(currency.currency_symbol);
  const rate = currency.currency_rate || 1;

  // Totals (identical logic to the previous react-pdf document).
  const { positiveTotal, negativeTotal } = items.reduce(
    (totals, item) => {
      if (item.deleted) return totals;
      const amount = toNumber(item.amount);
      if (amount >= 0) totals.positiveTotal += amount;
      else totals.negativeTotal += amount;
      return totals;
    },
    { positiveTotal: 0, negativeTotal: 0 }
  );

  const { positiveTotalExchange, negativeTotalExchange } = items.reduce(
    (totals, item) => {
      if (item.deleted) return totals;
      const amount = toNumber(item.amount) * rate;
      if (amount >= 0) totals.positiveTotalExchange += amount;
      else totals.negativeTotalExchange += amount;
      return totals;
    },
    { positiveTotalExchange: 0, negativeTotalExchange: 0 }
  );

  // ── Table rows ──
  const rows = items
    .filter((item) => !item.deleted)
    .map((item) => {
      const amountText = currencyEnabled
        ? `${symbol} ${esc(item.amount || "0")}`
        : `AED ${esc(item.amount || "0")}`;

      const exchangeAmount =
        item.amount && rate ? (toNumber(item.amount) * rate).toFixed(2) : "0.00";

      const priceCell = itemsPrice
        ? `<div class="col-1">${esc(item.price || "-")}</div>`
        : "";

      const currencyRow = currencyEnabled
        ? `<div class="row row-currency">
             <div class="col-desc"></div>
             ${itemsPrice ? '<div class="col-1"></div>' : ""}
             <div class="col-1"></div>
             <div class="col-1"></div>
             <div class="col-1"></div>
             <div class="col-1">(${esc(item.vat || "-")})</div>
             <div class="col-amt">(AED ${esc(exchangeAmount)})</div>
           </div>`
        : "";

      return `
        <div class="item">
          <div class="row row-item">
            <div class="col-desc desc">${esc(item.title || "No Title")}</div>
            ${priceCell}
            <div class="col-1">${esc(item.qty || "-")}</div>
            <div class="col-1">${esc(item.disc || "0%")}</div>
            <div class="col-1">${esc(item.vat_p || "0")}</div>
            <div class="col-1">${esc(item.vat || "-")}</div>
            <div class="col-amt amt">${amountText}</div>
          </div>
          ${currencyRow}
          <div class="body-row">${esc(item.body || " ")}</div>
        </div>`;
    })
    .join("");

  // ── Bank details ──
  const bankRows = Object.entries(bankDetail)
    .map(
      ([key, value]) => `
        <div class="bank-row">
          <div class="bank-key">${esc(key.replace(/_/g, " "))}</div>
          <div class="bank-value">${esc(value)}</div>
        </div>`
    )
    .join("");

  const exchangeRateRow = currencyEnabled
    ? `<div class="bank-row" style="margin-top:10pt;">
         <div class="bank-key">Exchange Rate</div>
         <div class="bank-value">AED ${esc(rate)} = 1.00 ${symbol}</div>
       </div>`
    : "";

  // ── Totals ──
  const subtotalValue = currencyEnabled
    ? `<div>${symbol} ${positiveTotal.toFixed(2)}</div>
       <div class="exchange">(AED ${(positiveTotalExchange || 0).toFixed(2)})</div>`
    : `<div>AED ${positiveTotal.toFixed(2)}</div>`;

  const totalValue = currencyEnabled
    ? `<div>${symbol} ${(positiveTotal + negativeTotal).toFixed(2)}</div>
       <div class="exchange">(AED ${(
         (positiveTotalExchange || 0) - (negativeTotalExchange || 0)
       ).toFixed(2)})</div>`
    : `<div>AED ${(positiveTotal + negativeTotal).toFixed(2)}</div>`;

  // ── Payment term lines (hidden when null, matching the original) ──
  const paymentLine = (label, value) =>
    value == null
      ? ""
      : `<div class="pay-label">${label}</div>
         <div class="pay-line">${esc(value)}</div>`;

  // ── Signature blocks (shown only when a name is present) ──
  const signatureBlock = (name, title, extra = "") =>
    name && name !== ""
      ? `<div class="sig-line"></div>
         <div class="sig-text">${esc(name)}</div>
         <div class="sig-text">${esc(title)}${esc(extra)}</div>`
      : "";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Helvetica, Arial, sans-serif;
    font-size: 9pt;
    color: #000;
    background: #fff;
    /* At least one printable page tall so the footer lands at the bottom of
       a short (single-page) invoice. display:flex + flex-direction:column
       lets the footer be pushed down with margin-top:auto instead of being
       absolutely positioned — this way it never forces a short invoice onto
       a second page, but also never gets stranded/overlapping content on a
       longer, multi-page invoice (see .footer below). */
    display: flex;
    flex-direction: column;
    min-height: 10.5in;
    box-sizing: border-box;
  }
  .header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    margin-bottom: 40pt;
  }
  .logo { height: 50pt; }
  .project-info { text-align: right; font-size: 8pt; }
  .project-line { font-size: 8pt; font-weight: 600; text-transform: uppercase; text-align: right; color: ${BLUE}; }
  .project-code { font-size: 8pt; font-weight: 300; color: #000; text-transform: uppercase; text-align: right; }

  .company { margin-bottom: 20pt; }
  .company-name { font-size: 11pt; font-weight: 700; text-transform: uppercase; }
  .company-detail { font-size: 11pt; font-weight: 300; }

  .references { margin-top: 30pt; margin-bottom: 40pt; width: 100%; }
  .references .cols { display: flex; flex-direction: row; flex-wrap: wrap; }
  .ref-text { font-size: 9pt; font-weight: 400; line-height: 1.5; }

  .table { margin-top: 16pt; border-top: 1pt solid ${ORANGE}; }
  .row { display: flex; flex-direction: row; }
  .row-head .cell { min-height: 20pt; color: ${BLUE}; font-weight: 600; font-size: 8pt; }
  .row-item { border-top: 1pt solid #000; padding-bottom: 5pt; }
  .col-desc { flex: 5; }
  .col-1 { flex: 1; text-align: right; font-size: 8pt; }
  .col-amt { flex: 2; text-align: right; }
  .row-head .col-desc { align-self: center; }
  .row-head .col-amt { align-self: center; text-transform: uppercase; }
  .row-item .desc { font-weight: 600; font-size: 9pt; }
  .row-item .amt { font-size: 9pt; font-weight: 500; }
  .row-currency { padding-bottom: 5pt; color: ${GRAY}; font-size: 7pt; }
  .row-currency .col-1, .row-currency .col-amt { color: ${GRAY}; font-size: 7pt; }
  .body-row { font-size: 8pt; padding: 2pt 0 15pt 0; white-space: pre-line; }

  .bank { margin-top: 20pt; }
  .bank-row { display: flex; flex-direction: row; margin-bottom: 2pt; width: 40%; }
  .bank-key { flex: 2; font-weight: 300; text-transform: capitalize; font-size: 8pt; }
  .bank-value { flex: 4; font-size: 8pt; font-weight: 300; }

  .total { margin-top: 40pt; margin-bottom: 60pt; display: flex; flex-direction: row; justify-content: space-between; width: 100%; }
  .total-left { flex: 2; display: flex; flex-direction: column; }
  .total-right { flex: 3; display: flex; flex-direction: row; justify-content: space-between; padding-left: 200pt; }
  .total-row { display: flex; flex-direction: row; justify-content: space-between; margin-bottom: 2pt; padding-bottom: 10pt; }
  .total-row .label-total { color: ${BLUE}; text-transform: uppercase; font-size: 10pt; font-weight: 600; }
  .flex-end { display: flex; flex-direction: column; align-items: flex-end; }
  .flex-end.total-amt { color: ${BLUE}; text-transform: uppercase; font-size: 10pt; font-weight: 600; }
  .exchange { text-align: right; color: ${GRAY}; font-size: 7pt; }

  .payment { margin-top: 30pt; }
  .pay-label { font-size: 9pt; font-weight: 600; color: ${BLUE}; }
  .pay-line { font-size: 8pt; font-weight: 400; }

  .sig-row { display: flex; flex-direction: row; flex-wrap: wrap; margin-top: 40pt; }
  .sig-col { flex: 1; }
  .sig-line { border-bottom: 1pt solid #000; margin-bottom: 2pt; margin-right: 140pt; }
  .sig-text { font-size: 7pt; font-weight: 400; line-height: 1.2; }

  /* Company footer — appears only once, always after all other content
     (it's the last element in the DOM), and is pushed to the bottom of the
     page via margin-top:auto on the flex-column body:
       - Short invoice (fits on one page): body's min-height fills the
         remaining space with the auto margin, so the footer sits flush at
         the bottom of the page — same visual result as fixed/absolute
         positioning would give.
       - Long invoice (multiple pages): body grows taller than one page, so
         there's no leftover space to push into — the footer simply follows
         directly after the last content block, which places it on the last
         page since nothing else follows it.
     break-inside/page-break-inside avoid the footer being sliced across a
     page boundary in either case. Font sizes are 10% larger than 10pt. */
  .footer {
    margin-top: auto;
    position: fixed;
    bootom: 10px
    //padding-top: 30pt;
    //break-inside: avoid;
    //page-break-inside: avoid;
  }
  .footer .cols { display: flex; flex-direction: row; justify-content: space-between; width: 100%; }
  .footer-col { flex: 1; }
  .footer-title { font-size: 10pt; color: #404040; font-weight: 600; }
  .footer-line { font-size: 10pt; color: #adacac; font-weight: 200; }
</style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    ${logoDataUri ? `<img class="logo" src="${logoDataUri}" />` : "<div></div>"}
    <div class="project-info">
      <div class="project-line">${esc(project.project_name)}</div>
      <div class="project-line">${esc(project.project_name_ll2)}</div>
      <div class="project-code">${esc(project.project_name_code)}</div>
    </div>
  </div>

  <!-- Company -->
  <div class="company">
    <div class="company-name">${esc(company.company_name)}</div>
    <div class="company-detail">${esc(company.company_address)}</div>
    <div class="company-detail">${esc(company.company_postal_city)}</div>
    <div class="company-detail">${esc(company.company_country)}</div>
  </div>

  <!-- References -->
  <div class="references">
    <div class="cols">
      <div style="flex:1;">
        <div class="ref-text">References</div>
        <div class="ref-text">${esc(reference.reference_number)}</div>
      </div>
      <div style="flex:2;">
        <div class="ref-text">${esc(reference.reference_contact_person_name_1)}</div>
        <div class="ref-text">${esc(reference.reference_contact_person_number_1)}</div>
        <div class="ref-text">${esc(reference.reference_contact_person_email_1)}</div>
      </div>
      <div style="flex:2;">
        <div class="ref-text">${esc(reference.reference_contact_person_name_2)}</div>
        <div class="ref-text">${esc(reference.reference_contact_person_number_2)}</div>
        <div class="ref-text">${esc(reference.reference_contact_person_email_2)}</div>
      </div>
      <div style="flex:1;">
        <div class="ref-text">Date</div>
        <div class="ref-text">${esc(reference.date)}</div>
      </div>
    </div>
  </div>

  <!-- Description table -->
  <div class="table">
    <div class="row row-head">
      <div class="col-desc cell">Description</div>
      ${itemsPrice ? '<div class="col-1 cell">PRICE</div>' : ""}
      <div class="col-1 cell">QTY</div>
      <div class="col-1 cell">DISC</div>
      <div class="col-1 cell">VAT%</div>
      <div class="col-1 cell">VAT</div>
      <div class="col-amt cell">AMOUNT</div>
    </div>
    ${rows}
  </div>

  <!-- Bank details -->
  <div class="bank">
    ${bankRows}
    ${exchangeRateRow}
  </div>

  <!-- Totals -->
  <div class="total">
    <div class="total-left">
      <div class="total-row">
        <div>Subtotal:</div>
        <div class="flex-end">${subtotalValue}</div>
      </div>
      <div class="total-row">
        <div>Total:</div>
        <div class="flex-end total-amt">${totalValue}</div>
      </div>
    </div>
    <div class="total-right">
      <div>Reference:</div>
      <div style="padding-left:10pt; font-weight:600;">${esc(
        reference.reference_number
      )}</div>
    </div>
  </div>

  <!-- Payment terms -->
  <div class="payment">
    ${paymentLine("Payment Terms:", paymentTerms.line1)}
    ${paymentLine("Not Included in the offer:", paymentTerms.line2)}

    <div class="sig-row">
      <div class="sig-col" style="padding-right:10pt;">
        ${signatureBlock(
          paymentTerms.signature_left_name,
          paymentTerms.signature_left_title
        )}
      </div>
      <div class="sig-col" style="padding-left:10pt;">
        ${signatureBlock(
          paymentTerms.signature_right_name,
          paymentTerms.signature_right_title
        )}
      </div>
    </div>
  </div>

  <!-- Acceptance -->
  <div class="sig-row">
    <div class="sig-col"></div>
    <div class="sig-col" style="padding-left:10pt;">
      <div class="sig-text">Understood, agreed, and accepted:</div>
    </div>
  </div>

  <!-- Bottom-right signature -->
  <div class="sig-row">
    <div class="sig-col"></div>
    <div class="sig-col" style="padding-left:10pt;">
      ${signatureBlock(
        paymentTerms.signature_bottom_right_name,
        paymentTerms.signature_bottom_right_title,
        paymentTerms.signature_bottom_right_company
      )}
    </div>
  </div>

  <!-- Footer (bottom of the last page, only) -->
  <div class="footer">
    <div class="cols">
      <div class="footer-col">
        <div class="footer-title">BUENA PUBLICA FZE</div>
        <div class="footer-line">BUILDING C1</div>
        <div class="footer-line">OFFICE 1208</div>
        <div class="footer-line">AJMAN FREEZONE, AJMAN</div>
        <div class="footer-line">UNITED ARAB EMIRATES</div>
      </div>
      <div class="footer-col">
        <div class="footer-title">Management</div>
        <div class="footer-line">JAN A. HUSSING</div>
      </div>
      <div class="footer-col">
        <div class="footer-title">BANK: ABU DHABI COMMERCIAL BANK</div>
        <div class="footer-line">ACCOUNT: 1200563292001</div>
        <div class="footer-line">BIC: ADCBAEAA</div>
        <div class="footer-line">IBAN: AE 02 0030 0120 0563 2920 001</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ── Public API ────────────────────────────────────────────────────────────────
async function generateInvoicePdf(formData) {
  const html = buildInvoiceHtml(formData);
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      // Bottom margin holds the page-number line; the company footer sits in
      // the body just above it.
      margin: { top: "0.55in", bottom: "0.6in", left: "0.55in", right: "0.55in" },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: FOOTER_TEMPLATE,
    });
    // page.pdf() returns a Uint8Array in Puppeteer v24; Express's res.send only
    // treats a Buffer as binary (a Uint8Array would be serialized as JSON), so
    // convert it here.
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

module.exports = { generateInvoicePdf, buildInvoiceHtml };