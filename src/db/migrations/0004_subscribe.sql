ALTER TABLE share_policies ADD COLUMN subscribe_amount TEXT NOT NULL DEFAULT '0';

CREATE TABLE webhooks (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL REFERENCES users(id),
  publisher_id TEXT NOT NULL REFERENCES users(id),
  url TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
