# Bug Ticket: Improve Invoice Component

## Target Files

- `Invoice.jsx`
- PDF generation service (backend)

## Description

Replace **`@react-pdf/renderer`** (currently version `^4.5.1`) with **Puppeteer** for PDF generation and rendering. Update the invoice generation flow to render the invoice as HTML and generate the PDF using Puppeteer on the server while preserving the existing layout and styling.