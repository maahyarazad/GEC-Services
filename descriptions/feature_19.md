# Feature Ticket 19: Dashboard Support Center UI Improvement

## Description

Add a detailed modal view that opens when a user clicks on a row in the Support Center table.

## Implementation

### Backend (`routes/support.js`)

- Updated `GET /api/admin/support/tickets/:id` to LEFT JOIN `GIC_Users` and return the assigned admin's `firstName`, `lastName`, and `email` alongside the ticket data.
- Updated the same endpoint to also JOIN admin names onto `support_ticket_comments` and `support_ticket_activity` rows so the UI can display who made each comment or performed each action.
- Added `GET /api/admin/support/admins` endpoint that returns all admin users (`id`, `firstName`, `lastName`, `email`) for use in the assign dropdown.

### Frontend (`TicketDetailModal.jsx`)

The modal already existed and opened on row click. Changes made:

1. **Assigned To row** — added to the Ticket Information section, showing the admin's name with a small avatar initial chip, or "Unassigned" in italic when no admin is set.
2. **Customer display** — separated `full_name` and `email` into stacked lines for better readability instead of the `name <email>` inline format.
3. **Assign Ticket section** — new section (below Change Status) with a dropdown of all admin users and a "Save Assignment" button, wired to the existing `PATCH /api/admin/support/tickets/:id/assign` endpoint.
4. **Activity timeline** — now shows the admin name alongside each activity entry ("by First Last").
5. **Comments** — now shows the admin name who posted each comment next to the Public/Internal chip.



# Feature Ticket 19: Support Center Logic Change

## Description

Replace the token-based validation mechanism with Google reCAPTCHA, allowing users to submit and track support tickets without authentication while still preventing spam and abuse.

## Implementation

Uses **reCAPTCHA v3** (invisible / score-based) so no widget is added to the
styled GEC forms — a token is generated and verified on each submit.

### Backend (`routes/support.js`)

* Added a `verifyRecaptcha(token, remoteIp)` helper that POSTs to Google's
  `siteverify` endpoint (via `node-fetch`). It supports both v2 and v3
  (score threshold of `0.5` enforced only when a score is returned) and
  **fails open** when `RECAPTCHA_SECRET_KEY` is not configured, so local dev
  keeps working without keys.
* `POST /support/ticket` — removed `authorize_member_or_partner`; now verifies
  the `recaptchaToken` form field before processing the submission.
* `GET /support/ticket/track` — removed the `authorize_ticket` middleware and
  all JWT/cookie logic. It now reads `ticketNumber` + `recaptchaToken` from the
  query string, verifies reCAPTCHA, and looks the ticket up by number directly.
* Removed the now-obsolete `POST /support/ticket/status` token-issuing route and
  the unused `jsonwebtoken` / `authorization_middleware` imports.

### Frontend

* New helper `components/utils/recaptcha.js` — lazy-loads the reCAPTCHA v3 script
  once and exposes `executeRecaptcha(action)`. Returns `''` when
  `VITE_RECAPTCHA_SITE_KEY` is unset (matches the backend's fail-open behaviour).
1. **SupportPortal** — calls `executeRecaptcha('submit_ticket')` and appends the
   token to the `FormData` before POSTing.
2. **TicketTracker** — calls `executeRecaptcha('track_ticket')` and issues a
   single `GET /support/ticket/track?ticketNumber=…&recaptchaToken=…`, replacing
   the previous two-step status/track cookie flow.

### Configuration

* `RECAPTCHA_SECRET_KEY` added to the server `.env` (server-side secret).
* `VITE_RECAPTCHA_SITE_KEY` added to `public/.env` (public site key).
  Both must be populated with a reCAPTCHA v3 key pair in production.



# Bug: Missing reCAPTCHA token

Eventhough I've set the secret and key I still get the recaptcha error without even being checked.

# Bug: reCAPTCHA shows up everywhere

So I put this script in head of index html 
<script src="https://www.google.com/recaptcha/enterprise.js?render=6Lei5xYtAAAAAAIOcrcQJP__y2XyfzxtLbHfWTg0" defer></script>

and it shows up everywhere I need this only in SupportPortal and TicketTracker components
