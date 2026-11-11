-- Generated (VIRTUAL) columns over the raw Twilio JSON, so queries and indexes can
-- use plain columns instead of json_extract (feature 017, WhatsApp chat history).
--
-- Not idempotent: ALTER TABLE ... ADD COLUMN fails with "duplicate column name" if a
-- column exists. Check first: PRAGMA table_xinfo(twilio_delivery); (hidden = 2).
-- Must run before ..._add_twilio_message_history_indexes.sql and before deploying 017.

ALTER TABLE twilio_delivery ADD COLUMN to_number TEXT
  GENERATED ALWAYS AS (json_extract(response, '$.To')) VIRTUAL;
ALTER TABLE twilio_delivery ADD COLUMN msg_status TEXT
  GENERATED ALWAYS AS (json_extract(response, '$.MessageStatus')) VIRTUAL;
ALTER TABLE twilio_delivery ADD COLUMN msg_sid TEXT
  GENERATED ALWAYS AS (json_extract(response, '$.MessageSid')) VIRTUAL;

ALTER TABLE twilio_responses ADD COLUMN media_url TEXT
  GENERATED ALWAYS AS (json_extract(payload, '$.MediaUrl0')) VIRTUAL;

ALTER TABLE twilio_responses ADD COLUMN media_type TEXT
  GENERATED ALWAYS AS (json_extract(payload, '$.MediaContentType0')) VIRTUAL;

ALTER TABLE twilio_responses ADD COLUMN body TEXT
  GENERATED ALWAYS AS (json_extract(payload, '$.Body')) VIRTUAL;
