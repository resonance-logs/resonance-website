-- Add Discord OAuth tokens to users table
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS discord_access_token TEXT,
    ADD COLUMN IF NOT EXISTS discord_refresh_token TEXT;

-- Ensure last_login_at column exists (nullable TIMESTAMPTZ). If it already exists this is a no-op.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
