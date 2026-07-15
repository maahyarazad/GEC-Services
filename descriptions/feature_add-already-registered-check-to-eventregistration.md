
# Feature 26 – Add "Already Registered" Check to `EventRegistration.jsx`

# Part 1
## Description

In **`EventRegistration.jsx`**, before calling the following endpoint:

```js
const attRes = await fetch(
    `${SERVER}/registration/contacts/complete-attendance?contactId=${contactId}&eventId=${eventId}`,
    {
        method: "PATCH",
        credentials: "include",
    }
);
```

send a **GET** request to check whether the contact is already registered for the selected event.

If the response indicates that the contact is already registered:

- Display an **exclamation mark (`!`)** next to the contact.
- Show the text **"Already Registered"**.
- Do **not** call the `PATCH` endpoint.

If the contact is **not** already registered, continue with the existing flow and call the `PATCH` endpoint.

## Backend Endpoint

```js
router.patch(
  "/registration/contacts/complete-attendance",
  authorization_middleware.authorize_operator,
  async (req, res) => {
    try {
      const { contactId, eventId } = req.query;

      if (!contactId || !eventId) {
        return res.status(400).json({
          status: false,
          message: "contactId and eventId are required",
        });
      }

      const completeAttendanceQuery = `
        UPDATE event_guest_list
        SET complete_attendance = 1
        WHERE contact_book_id = ?
          AND event_id = ?
      `;

      const stmt = db.prepare(completeAttendanceQuery);
      const result = stmt.run(contactId, eventId);

      if (result.changes === 0) {
        return res.status(404).json({
          status: false,
          message: "No matching guest found",
        });
      }

      res.status(200).json({
        status: true,
        message: "Attendance marked complete",
      });
    } catch (error) {
      console.error("Failed to update attendance:", error);

      res.status(500).json({
        status: false,
        message: "Failed to update attendance",
      });
    }
  }
);
```


# Part 2

## Description

### 1. Display Event Information During Attendance Check

In **`EventRegistration.jsx`**, while calling the following endpoint:

```js
const attRes = await fetch(
    `${SERVER}/registration/contacts/complete-attendance?contactId=${contactId}&eventId=${eventId}`,
    {
        method: "PATCH",
        credentials: "include",
    }
);
```

Create a new endpoint that uses the **operator authorization middleware** to retrieve the event details.

Display the **event title** and **event date** at the top of the page so the operator can verify that the scanned QR code belongs to the correct event before completing the attendance.

---

### 2. Create a Registration Endpoint for GEC Member Lookup

In **`EventRegistration.jsx`**, we currently use the following API call to check whether a contact is a GEC member:

```js
// 4. Look up GEC membership using the contact's phone (+ name).
if (contactRecord?.phone) {
    const name = fullName(contactRecord.first_name, contactRecord.last_name);
    const url =
        `${SERVER}/api/gec/members/check?phone_number=${encodeURIComponent(contactRecord.phone)}` +
        (name ? `&full_name=${encodeURIComponent(name)}` : "");

    const gRes = await fetch(url, { credentials: "include" });
    const gData = await gRes.json().catch(() => ({}));

    setGecMember(
        gData.status && Array.isArray(gData.data) && gData.data.length
            ? gData.data[0]
            : null
    );
}
```

Create a new endpoint under the **registration** route:

```text
/registration/gec-member-check
```

Requirements:

- Use the **operator authorization middleware** for this endpoint.
- Move the existing membership lookup logic into this new endpoint.
- Replace the current frontend API call with the new registration endpoint.

---

### 3. Show a Loading Indicator

Display a loading indicator while all required API requests are in progress, including:

- Retrieving the event details.
- Completing the attendance request.
- Checking the GEC membership status.

The loading indicator should remain visible until all API calls have completed.