# Feature Ticket 20: WhatsApp QR Update

## Part - 1
## Description

1. Add a new media template type in `CreateTwilioTemplate.jsx` to support sending a template creation 


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
