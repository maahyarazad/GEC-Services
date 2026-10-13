// Category taxonomy for the do-not-reply email log (feature 008-email-log-dashboard).
//
// Each do-not-reply email the platform sends is tagged with one of these stable
// KEYS at its send site in services/emailService.js. The KEY is what gets stored
// in email_log.category; the LABEL is the human-readable name shown in the admin
// dashboard. Keys are stable (safe to query/index); labels may be reworded freely.
//
// See specs/008-email-log-dashboard/research.md (R5) for the key -> send-function
// mapping. `uncategorised` is the catch-all for any send that reaches the
// transport without a category, so no email is ever dropped from the log.

const EMAIL_CATEGORIES = Object.freeze({
  "event-registration": "Event Registration Confirmation",
  "confirmation-message": "Confirmation Message",
  "membership-pass": "Membership Pass",
  "membership-card": "Membership Card",
  "membership-invitation": "Membership Invitation",
  otp: "OTP / Login Code",
  "request-received": "Request Received",
  "company-data-confirmation": "Company Data Confirmation",
  "password-reset": "Password Reset",
  "party-invitation": "Party Invitation",
  "venue-courtesy": "Venue Courtesy Message",
  "newsletter-batch": "Newsletter / Batch",
  uncategorised: "Other / Uncategorised",
});

const UNCATEGORISED = "uncategorised";

// Resolve a stored key to its label, falling back to the key itself so an
// unknown/legacy value still renders something meaningful rather than blank.
function labelFor(key) {
  if (!key) return EMAIL_CATEGORIES[UNCATEGORISED];
  return EMAIL_CATEGORIES[key] || key;
}

module.exports = { EMAIL_CATEGORIES, UNCATEGORISED, labelFor };
