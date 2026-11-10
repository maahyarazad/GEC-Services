-- Indexes for the WhatsApp chat history queries (feature 017).
-- Depends on ..._add_twilio_generated_columns.sql (idx_td_to_status uses its columns).

CREATE INDEX idx_td_to_status ON twilio_delivery (to_number, msg_status, metadata_createdAt);

CREATE INDEX idx_ttm_messagesid
ON twilio_template_message ("messageSid");   -- skip if already PK/unique

-- received query
CREATE INDEX idx_tr_waid
ON twilio_responses ((payload ->> 'WaId'));

-- history pagination: filter by WaId + keyset ORDER BY received_at DESC, id DESC
CREATE INDEX IF NOT EXISTS idx_tr_waid_received
ON twilio_responses ((payload ->> 'WaId'), received_at, id);
