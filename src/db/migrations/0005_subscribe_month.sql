ALTER TABLE follows ADD COLUMN expires_at INTEGER NOT NULL DEFAULT 0;
UPDATE follows SET expires_at = created_at + 2592000000 WHERE expires_at = 0;
