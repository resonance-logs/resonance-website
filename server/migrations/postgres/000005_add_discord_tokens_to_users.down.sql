-- Remove Discord OAuth tokens from users table
ALTER TABLE users
    DROP COLUMN IF EXISTS discord_access_token,
    DROP COLUMN IF EXISTS discord_refresh_token;

-- NOTE: don't drop last_login_at because older migrations may rely on it. If you really want to revert it, uncomment below.
-- ALTER TABLE users DROP COLUMN IF EXISTS last_login_at;
