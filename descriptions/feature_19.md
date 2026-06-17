# Feature Ticket 21: Dashboard Support Center UI Improvement

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



# Feature Ticket 22: Support Center Logic Change

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



# Feature Ticket 23: Support Center — Two-Way Email Communication

## Description
Enable two-way email communication between support staff and ticket submitters,
keeping all messages synced within the Admin Dashboard ticket thread.

## User Stories
- As an **admin**, I can reply to or comment on a ticket from the Dashboard,
  and the submitter receives my message as an email reply within the existing thread.
- As a **ticket submitter**, I can reply to the support email
  (app.support@german-emirates-club.com) and my reply is automatically appended
  to the correct ticket in the Dashboard.

## Acceptance Criteria
- [ ] Admin replies sent from the Dashboard trigger an outbound email to the submitter.
- [ ] Outbound emails use a ticket-scoped Reply-To header
      (e.g. `app.support+ticket-23@german-emirates-club.com`) for thread matching.
- [ ] An IMAP listener monitors the support inbox for inbound replies.
- [ ] Inbound emails are matched to the correct ticket via the Reply-To/ticket ID
      in the email subject or headers.
- [ ] Matched replies are appended to the ticket thread in the Dashboard.
- [ ] Unmatched emails (no ticket ID found) are flagged for manual review
      or create a new ticket.
- [ ] Admin receives a Dashboard notification when a new inbound reply arrives.
- [ ] Submitter receives an email notification when an admin replies.

## Technical Notes
- Use IMAP IDLE or polling to monitor `app.support@german-emirates-club.com`.
- Encode the ticket ID in the `Reply-To` header on every outbound email.
- Parse inbound emails for the ticket ID in `References`, `In-Reply-To`,
  or subject line before falling back to manual matching.

## Out of Scope
- Live chat or real-time messaging inside the Dashboard.
- Support for attachments in email replies (handle in a separate ticket).

## Dependencies
- Outbound email service (SMTP) already configured.
- Admin Dashboard ticket detail view (must support appending new messages).