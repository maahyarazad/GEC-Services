# Feature Ticket 20: WhatsApp QR Update

## Part - 1
## Description

1. Add a new media template type in `CreateTwilioTemplate.jsx` to support sending a template creation 

### Example Built Media Template

```js
{
  "account_sid": "******",
  "date_created": "2026-06-24T07:57:50Z",
  "date_updated": "2026-06-24T08:00:00Z",
  "friendly_name": "clubtime_dubai_7th_july_2026_reminder_en",
  "language": "en",
  "links": {
    "approval_create": "https://content.twilio.com/v1/Content/******/ApprovalRequests/whatsapp",
    "approval_fetch": "https://content.twilio.com/v1/Content/******/ApprovalRequests"
  },
  "sid": "******",
  "types": {
    "twilio/media": {
      "body": "🔴 ATTENTION 🔴\n\nDear {{first_name}},\nthank you for registering for our ClubTime Dubai!\nWe look forward to welcoming you.\n\nDate: July 7, 2026\n🟨 We start at 7:00 PM\n\n📍Location: Media One Hotel, Restaurant QWERTY {{google_map_location}}\n\n•\tDress code: business casual\n•\tValet Parking and a Welcome drink (1 beer, 1 wine, or 1 soft drink) included\n\nWe look forward to a great evening! 👋\nBest regards, Sylvia and the German Emirates Club Team",
      "media": [
        "{{qr_code_url}}"
      ]
    }
  },
  "url": "https://content.twilio.com/v1/Content/******",
  "variables": {
    "first_name": "Maahyar Azad",
    "google_map_location": "https://maps.app.goo.gl/m53EBxwzYHD3CotY7?g_st=awb",
    "qr_code_url": "https://services.german-emirates-club.com/qr_codes/introduction-medical-german-society/gms-imgs-17715892355912574.png"
  }
}
```

## Notes

- Ensure the new media template type is compatible with the existing Twilio template creation flow.
- Validate the payload before sending the request to `twilioClient`.


## Part 2

## Description

### 1. Create Event Registration Page

Create a new page similar to `GuestRegistration.jsx` and name it `EventRegistration.jsx`.

In this page:

* Authorize the user by sending a request to the same authentication endpoints used in `GuestRegistration.jsx`.
* Change the token expiration time (`expiresIn`) from **1 week** to **6 hours**.
* Create a new middleware named `authorize_operator`.
* Register the new route in `App.jsx`:

```jsx
<Route
    path="/event-registration/:queryParam"
    element={<EventRegistration />}
/>
```

```js
router.post("/operator/login", upload.none(), loginLimiter, (req, res) => {
  const { password } = req.body;

  if (password === process.env.VITE_ADMIN_PASSWORD) {
    const oneWeekInSeconds = 7 * 24 * 60 * 60;
    const oneWeekInMilliseconds = oneWeekInSeconds * 1000;

    const token = jwt.sign(
      { role: "operator" },
      process.env.JWT_SECRET,
      { expiresIn: `${oneWeekInSeconds}s` }
    );

    res.cookie("o-usr", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: oneWeekInMilliseconds,
    });

    return res.json({ success: true });
  }

  // Invalid password counts towards rate limit
  return res.status(401).json({ error: "Invalid password" });
});

// Auto login an admin user via an HMAC token generated server-side with GEC_SECRET.
// Token = HMAC_SHA256(email, GEC_SECRET) — the secret never leaves the server, the
// client only ever presents a token it cannot forge.
router.get("/operator/auto-login", loginLimiter, (req, res) => {
  try {
    const email = typeof req.query.email === "string" ? req.query.email.trim() : "";
    const token = typeof req.query.token === "string" ? req.query.token.trim() : "";

    if (!email || !token) {
      return res.status(401).json({ success: false, error: "Missing credentials" });
    }

    const secret = process.env.GEC_SECRET;
    if (!secret) {
      console.error("GEC_SECRET is not configured");
      return res.status(500).json({ success: false, error: "Server misconfiguration" });
    }

    const expected = crypto
      .createHmac("sha256", secret)
      .update(email)
      .digest("hex");

    // Timing-safe comparison; bail out early on length mismatch since
    // timingSafeEqual throws when buffer lengths differ.
    const provided = token.toLowerCase();
    const expectedBuf = Buffer.from(expected, "utf8");
    const providedBuf = Buffer.from(provided, "utf8");

    const valid =
      expectedBuf.length === providedBuf.length &&
      crypto.timingSafeEqual(expectedBuf, providedBuf);

    if (!valid) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const oneWeekInSeconds = 7 * 24 * 60 * 60;
    const oneWeekInMilliseconds = oneWeekInSeconds * 1000;

    const sessionToken = jwt.sign(
      { role: "operator" },
      process.env.JWT_SECRET,
      { expiresIn: `${oneWeekInSeconds}s` }
    );

    res.cookie("o-usr", sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: oneWeekInMilliseconds,
    });

    return res.json({ success: true, email });
  } catch (err) {
    console.error("Auto-login error:", err);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});
```


2. Load Event Registration Details

After the operator logs in successfully, send the queryParam received from the URL to the following endpoint.

Use the newly created authorize_operator middleware to protect the endpoint.

```js
router.patch("/registration/contacts/complete-attendance", operator_middleware, async (req, res) => {
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
});


```



## Part 3

## Description

### 1. Add "Use QR Code" Option to Message Modal

In `MessageModal.jsx`, add a new switch labeled **Use QR Code**.

Requirements:

* Bind the switch value to `handleMessageStateChange`.
* Add a new boolean property named `useQrCode`.
* The switch should only be visible when **Use Guest List** is enabled.
* Include the `useQrCode` value in the API request payload.




```md
Summary

1. authorize_operator middleware (middleware/auth.js)
- New middleware that reads the o-usr cookie, verifies the JWT, and requires role === "operator" (returns 401 unauthorized / 403 forbidden / 401 invalid token, matching the existing middlewares). Sets req.user.

2. Operator auth endpoints (routes/registration.js)
- POST /operator/login — password check against VITE_ADMIN_PASSWORD, issues a { role: "operator" } JWT in the o-usr cookie. expiresIn changed from 1 week → 6 hours (cookie maxAge matched).
- GET /operator/auto-login — HMAC-SHA256(email, GEC_SECRET) timing-safe verification → operator session, also 6-hour expiry.
- GET /operator/check-auth — lets the page detect an existing operator session on load (mirrors /admin/check-auth).
- Protected PATCH /registration/contacts/complete-attendance with authorize_operator.
- Also fixed a latent bug: that handler referenced an undefined db, so I added const db = dbService.getDB(); (it would have thrown ReferenceError on every call).

3. Route registration (public/src/App.jsx)
- Added the lazy import and <Route path="/event-registration/:queryParam"/>} />.

4. EventRegistration.jsx (public/src/components/eventRegistration/)
- Modeled on GuestRegistration.jsx, but authorizes against the server:
  - On load → GET /operator/check-auth; if already authed, marks attendan
  - Otherwise shows a Formik password login → POST /operator/login (sent as FormData since the route uses upload.none()), then proceeds.
  - Sends the URL's :queryParam straight through to PATCH /registration/cqueryParam> (so contactId/eventId flow through), with credentials:'include'. A 401/403 drops back to the login form.
  - Renders a green/red result card with the endpoint's message.

Verification: node --check passes on auth.js and registration.js; App.jsxrse cleanly via Babel.

```

## Part 4

### Description

1. Add contact record information into **EventRegistration**.

   Use the `/gec/members/check` endpoint to retrieve GEC membership data.

2. Create an endpoint in `contact_book.js` to fetch contact information:

```js
router.get("/api/contacts/:id", (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ status: false, message: "ID is required" });
    }

    // Get record here

    if (result.changes === 0) {
      return res
        .status(404)
        .json({ status: false, message: "Contact not found" });
    }

    res.status(200).json({
      status: true,
      // data:
    });
  } catch (error) {
    console.error("Failed to get contact:", error.message);
    res
      .status(500)
      .json({ status: false, message: "Failed to get contact" });
  }
});
```

3. Use this endpoint to retrieve contact information and display all combined details in **EventRegistration**.

4. Improve the overall layout and organize the data into categorized sections. Note that this page will be used only on mobile devices, so ensure it is mobile-friendly.


## Part 5

### Description

1. Improve the **CreateTwilioTemplate.jsx** media type section by disabling the **Media URL** input field.

2. Set the **Media URL** field value to:

   ```text
   {{qr_code_url}}
   ```

3. This value should only be applied when the selected template type is **Media Template**.

4. The example value should be disable and fix to this value 'https://services.german-emirates-club.com/qr_codes/7-1301.png'


## Part 6

### Description

1. Improve the user experience of the **MessageModal.jsx** modal. Whenever the variable name is equal to `'qr_code_url'`, automatically populate the corresponding value field.

2. Set the **Variable `qr_code_url`** field value to:

   ```text
   {{qr_code_url}}
   ```
````
