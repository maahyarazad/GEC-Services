-- Create clubtime_guests (Feature 24: Past Events Log, commit 098cf2829, 2026-06-29).
--
-- WARNING: starts with DROP TABLE IF EXISTS — running it on a database that already
-- has clubtime_guests deletes those rows. Only for a database without that table.

DROP TABLE IF EXISTS clubtime_guests;
CREATE TABLE clubtime_guests (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  event_title    TEXT NOT NULL,                       -- e.g. 'ClubTime - 2026-07-07'
  event_type     TEXT NOT NULL,                       -- 'ClubTime' | 'Business Breakfast'
  name           TEXT NOT NULL,                       -- guest / attendee name
  member_partner TEXT,                                -- membership status or partner/company
  remarks        TEXT,                                -- e.g. payment notes ('50 AED', 'Card')
  mobile         TEXT,                                -- phone, digits only, may be blank
  invitee        TEXT,                                -- invited via / by ('App', 'Sylvia', ...)
  note           TEXT,                                -- free-text note
  event_date     TEXT NOT NULL,                       -- DATE as 'YYYY-MM-DD' (from Excel serial)
  created_at     DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_event_date  ON clubtime_guests (event_date);
CREATE INDEX idx_event_type  ON clubtime_guests (event_type);
CREATE INDEX idx_event_title ON clubtime_guests (event_title);
CREATE INDEX idx_mobile      ON clubtime_guests (mobile);
CREATE INDEX idx_name        ON clubtime_guests (name);
