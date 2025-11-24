-- Remove client_version column from encounters
ALTER TABLE encounters DROP COLUMN IF EXISTS client_version;
DROP INDEX IF EXISTS idx_client_version;
