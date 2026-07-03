````markdown
# Bug Ticket: Invoice PDF Renderer Flashing and Scrolling to the Top

## Target Files

- `Invoice.jsx`
- `PDFGenerator.jsx`

## Description

In **`PDFGenerator.jsx`**, the `formData` object stores the current form values, while **`Invoice.jsx`** renders the PDF in real time.

Currently, when an Accordion item is expanded or collapsed, the `MyDocument` component flashes and the `PDFViewer` scrolls back to the top. Fix this issue so that expanding or collapsing Accordion items does not cause the PDF to re-render unnecessarily, flash, or lose its current scroll position.

```jsx
<PDFViewer key={renderKey} style={{ width: '100%', height: '100%' }}>
  <MyDocument formData={formData} />
</PDFViewer>
```
````
