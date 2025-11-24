-- Add client_version column to encounters
ALTER TABLE encounters ADD COLUMN client_version VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_client_version ON encounters (client_version);
