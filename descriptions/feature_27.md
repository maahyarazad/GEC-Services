# Bug Ticket: Improve Invoice Component

## Target Files

- `Invoice.jsx`
- PDF generation service (backend)

## Description

Replace **`@react-pdf/renderer`** (currently version `^4.5.1`) with **Puppeteer** for PDF generation and rendering. Update the invoice generation flow to render the invoice as HTML and generate the PDF using Puppeteer on the server while preserving the existing layout and styling.


## Description
This below part of the footer should always at the bottom bump to bump with page number not matter what!



```html
 <!-- Footer -->
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
```

## Description
So I have place the CHROME_BIN=.puppeteer-cache/chrome/linux-148.0.7778.97/chrome-linux64/chrome in mu env and also installed the chormioum for linux I need you to update the invoiceService.js using the below code

```js
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_BIN, headless: true, args: ["--no-sandbox"] });
```