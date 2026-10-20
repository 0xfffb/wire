CREATE TABLE publishers (
  user_id TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved')),
  audience TEXT NOT NULL CHECK (audience IN ('public', 'subs')) DEFAULT 'public',
  markets TEXT NOT NULL DEFAULT '[]',
  price INTEGER NOT NULL DEFAULT 29,
  subscribers INTEGER NOT NULL DEFAULT 0,
  ytd TEXT NOT NULL DEFAULT '—',
  note TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE subscriptions (
  subscriber_id TEXT NOT NULL,
  publisher_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (subscriber_id, publisher_id),
  FOREIGN KEY (subscriber_id) REFERENCES users(id),
  FOREIGN KEY (publisher_id) REFERENCES users(id)
);

CREATE INDEX publishers_status ON publishers (status);
CREATE INDEX subscriptions_publisher ON subscriptions (publisher_id, expires_at);
CREATE INDEX subscriptions_subscriber ON subscriptions (subscriber_id, expires_at);
