-- Smart Receipts Upload Tracking Migration
-- Run this in your Supabase SQL Editor to add upload tracking

-- Table for tracking uploaded receipts
CREATE TABLE IF NOT EXISTS uploaded_receipts (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    receipt_key TEXT NOT NULL, -- Unique identifier: email_id_filename or email_id_body
    uploaded_to_dropbox BOOLEAN DEFAULT FALSE,
    upload_timestamp TIMESTAMP WITH TIME ZONE,
    dropbox_paths TEXT[], -- Array to store multiple paths (for USD conversions)
    receipt_metadata JSONB, -- Store vendor, date, amount, currency, etc.
    source_type TEXT, -- 'gmail_attachment', 'gmail_body', 'upload'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, receipt_key)
);

-- Index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_uploaded_receipts_user_id
    ON uploaded_receipts(user_id);

-- Index for filtering uploaded vs not uploaded
CREATE INDEX IF NOT EXISTS idx_uploaded_receipts_status
    ON uploaded_receipts(user_id, uploaded_to_dropbox);

-- Grant necessary permissions
GRANT ALL ON uploaded_receipts TO postgres, anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE uploaded_receipts_id_seq TO postgres, anon, authenticated, service_role;

-- Optional: Enable Row Level Security (RLS)
-- Uncomment if you want to use Supabase auth with RLS

-- ALTER TABLE uploaded_receipts ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can only access their own uploaded receipts"
--     ON uploaded_receipts FOR ALL
--     USING (auth.uid()::text = user_id);
