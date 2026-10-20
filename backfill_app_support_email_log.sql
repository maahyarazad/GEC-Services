-- Backfill historical app.support@ outbound emails into email_log.
--
-- The Email Logs dashboard has a mailbox toggle (feature 013): "do-not-reply"
-- (every category except app-support) and "app.support" (the app-support
-- category). App-support sends only started being logged in email_log from the
-- commit that added services/emailService.js' app-support logging, so every
-- support email sent before that deploy is missing and the "app.support" view
-- comes back empty.
--
-- This script reconstructs those historical sends from the support ticket
-- tables, in the SAME shape the live logger writes (see routes/support.js):
--   1. one "Support Ticket Received - <num>" confirmation per ticket
--      (sent from the ticket-create path), and
--   2. one "Re: [<num>] <subject>" reply per PUBLIC ADMIN comment
--      (sent from the admin comment path).
--
-- Recipients are the ticket submitter (already stored lower-cased), status is
-- 'sent', and created_at is the ticket/comment timestamp converted from the
-- stored UTC datetime text to the epoch-millisecond integer email_log uses.
-- message_id/response/error are left NULL — they were never captured for these.
--
-- Idempotent: each INSERT skips rows already present, so it is safe to run more
-- than once. Apply out-of-band like create_tables.sql, e.g.
--   sqlite3 app.db < backfill_app_support_email_log.sql
-- Live sends log themselves from now on; this only fills the historical gap.

-- 1) Ticket-received confirmations (one per ticket).
INSERT INTO email_log (category, recipient, subject, status, error, message_id, response, created_at)
SELECT 'app-support',
       lower(t.email),
       'Support Ticket Received - ' || t.ticket_number,
       'sent', NULL, NULL, NULL,
       CAST(strftime('%s', t.created_at) AS INTEGER) * 1000
  FROM support_tickets t
 WHERE NOT EXISTS (
         SELECT 1 FROM email_log e
          WHERE e.category  = 'app-support'
            AND e.recipient = lower(t.email)
            AND e.subject   = 'Support Ticket Received - ' || t.ticket_number
       );

-- 2) Public admin replies (one per public admin comment). The subject repeats
--    across replies to the same ticket, so created_at is part of the dedupe key.
INSERT INTO email_log (category, recipient, subject, status, error, message_id, response, created_at)
SELECT 'app-support',
       lower(t.email),
       'Re: [' || t.ticket_number || '] ' || t.subject,
       'sent', NULL, NULL, NULL,
       CAST(strftime('%s', c.created_at) AS INTEGER) * 1000
  FROM support_ticket_comments c
  JOIN support_tickets t ON t.id = c.ticket_id
 WHERE c.is_public = 1
   AND c.source    = 'admin'
   AND NOT EXISTS (
         SELECT 1 FROM email_log e
          WHERE e.category   = 'app-support'
            AND e.recipient  = lower(t.email)
            AND e.subject    = 'Re: [' || t.ticket_number || '] ' || t.subject
            AND e.created_at = CAST(strftime('%s', c.created_at) AS INTEGER) * 1000
       );
