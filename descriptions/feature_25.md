
# Feature 26 – Add "Already Registered" Check to `EventRegistration.jsx`

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

