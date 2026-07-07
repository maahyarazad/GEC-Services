# Feature 28 – Improve QR Code Column in Guest List

## Description

### `GuestListPanel.jsx`

When the user clicks on an event, open a modal. Keep all existing `useEffect` and `useCallback` hooks that fetch data from the server.

Inside the modal, display a checklist that allows the user to select one or more WhatsApp media templates. The checklist should load records where the template type is `twilio/media`, displaying:

- **Label:** Template name
- **Value:** `contentSid`

---

### 1. Load and Cache WhatsApp Media Templates

In **`WhatsApp.jsx`**, after calling `/api/whatsapp/list`, create a memoized dataset using `useMemo`.

Only populate this dataset when the template type is `twilio/media`.

```js
if (templateType && templateType === "twilio/media") {
  // Create memoized dataset here
}
```

The user may either:

- Select one or more media templates.
- Skip this step.

If the user skips this step, use SnackBar and a new warning message style just add the color
```jsx
const warningAlertSx = {
    
    fontWeight: 500,
    borderRadius: "8px",
       alignItems: "center",
    boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
    "& .MuiAlert-icon": { color: "#555" }, 
     "& .MuiAlert-message": { padding: 0, fontSize: "0.875rem", lineHeight: 1.5 },
};

```


> **Warning:** You have opted out of receiving QR Code delivery information.

---

### 2. Create a New QR Code Endpoint

When the user selects one or more `contentSid` values, send them to the server.

Instead of using the existing endpoint, create a new endpoint:

```js
router.post("/api/events/qr-code/by-ids", async (req, res) => {
  const { ids, eventId } = req.body;

  if (!Array.isArray(ids) || !ids.length) {
    return res.json({ status: true, data: [] });
  }

  const data = await Promise.all(
    ids.map(async (id) => {
      const result = await check_generateQR_WhatsApp(id, eventId?.id);

      return {
        contact_book_id: id,
        qr: result,
      };
    })
  );

  return res.json({ status: true, data });
});
```

---

### 3. Check Whether the QR Code Was Already Generated

Before generating a QR code, check whether a record already exists in the database using the following query:

```sql
SELECT *
FROM contact_book_events AS cbe
WHERE cbe.contentSid = 'HX2e722db0416a3185196f35aeb2ea8578'
  AND cbe.contact_book_id = 1302
  AND cbe.event_id = 7;
```

If a matching record exists, return `true`.

---

### 4. View an Existing QR Code

If the QR code already exists (indicated by the green check icon), allow the operator to click the icon to view the QR code.

Update the endpoint below so that it returns the QR code buffer instead of only the status. The frontend should use this buffer to display the QR code inside a modal.

```js
router.post("/api/events/qr-code/by-ids", async (req, res) => {
  const { ids, eventId } = req.body;

  if (!Array.isArray(ids) || !ids.length) {
    return res.json({ status: true, data: [] });
  }

  const data = await Promise.all(
    ids.map(async (id) => {
      const result = await check_generateQR_WhatsApp(id, eventId?.id);

      return {
        contact_book_id: id,
        qr: result,
      };
    })
  );

  return res.json({ status: true, data });
});
```




## Description

In `GuestListPanel.jsx`, there is a section where the user is asked to select template IDs.

Remove the entire part, and always send the template IDs so this is a part of the UI all the time now

