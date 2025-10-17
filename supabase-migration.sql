-- Smart Receipts Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Table for Gmail OAuth tokens (per user)
CREATE TABLE IF NOT EXISTS gmail_tokens (
    user_id TEXT PRIMARY KEY,
    token_data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for Gmail OAuth state tokens (for CSRF protection)
CREATE TABLE IF NOT EXISTS gmail_oauth_states (
    state_token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for cleaning up expired states
CREATE INDEX IF NOT EXISTS idx_gmail_oauth_states_created
    ON gmail_oauth_states(created_at);

-- Table for Dropbox OAuth tokens (per user)
CREATE TABLE IF NOT EXISTS dropbox_tokens (
    user_id TEXT PRIMARY KEY,
    refresh_token TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for Dropbox OAuth state tokens (for CSRF protection)
CREATE TABLE IF NOT EXISTS dropbox_oauth_states (
    state_token TEXT PRIMARY KEY,
    user_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for cleaning up expired states
CREATE INDEX IF NOT EXISTS idx_dropbox_oauth_states_created
    ON dropbox_oauth_states(created_at);

-- Table for user's Dropbox folder preferences
CREATE TABLE IF NOT EXISTS dropbox_folder_preferences (
    user_id TEXT PRIMARY KEY,
    folder_path TEXT NOT NULL DEFAULT '/Smart Receipts',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Enable Row Level Security (RLS) for user data isolation
-- Uncomment if you want to use Supabase auth with RLS

-- ALTER TABLE gmail_tokens ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE dropbox_tokens ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE dropbox_folder_preferences ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can only access their own gmail tokens"
--     ON gmail_tokens FOR ALL
--     USING (auth.uid()::text = user_id);

-- CREATE POLICY "Users can only access their own dropbox tokens"
--     ON dropbox_tokens FOR ALL
--     USING (auth.uid()::text = user_id);

-- CREATE POLICY "Users can only access their own folder preferences"
--     ON dropbox_folder_preferences FOR ALL
--     USING (auth.uid()::text = user_id);

-- Cleanup function for expired OAuth states (optional, can be run as a cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
    DELETE FROM gmail_oauth_states
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 hour';

    DELETE FROM dropbox_oauth_states
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON gmail_tokens TO postgres, anon, authenticated, service_role;
GRANT ALL ON gmail_oauth_states TO postgres, anon, authenticated, service_role;
GRANT ALL ON dropbox_tokens TO postgres, anon, authenticated, service_role;
GRANT ALL ON dropbox_oauth_states TO postgres, anon, authenticated, service_role;
GRANT ALL ON dropbox_folder_preferences TO postgres, anon, authenticated, service_role;
