CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS publisher_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS share_policies (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  audience TEXT NOT NULL DEFAULT 'public',
  show_cost INTEGER NOT NULL DEFAULT 0,
  show_fill_price INTEGER NOT NULL DEFAULT 0,
  show_fill_qty INTEGER NOT NULL DEFAULT 0,
  delay_minutes INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS broker_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  broker TEXT NOT NULL,
  status TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT '',
  access_token_enc TEXT,
  refresh_token_enc TEXT,
  access_expires_at INTEGER,
  last_sync_at INTEGER,
  last_error TEXT,
  fill_cursor TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS broker_accounts (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES broker_connections(id),
  acc_id TEXT NOT NULL,
  card_mask TEXT NOT NULL DEFAULT '',
  markets TEXT NOT NULL DEFAULT '[]',
  included INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS broker_accounts_connection_acc
  ON broker_accounts(connection_id, acc_id);

CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  code_verifier TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS position_snapshots (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES broker_accounts(id),
  synced_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY,
  snapshot_id TEXT NOT NULL REFERENCES position_snapshots(id),
  code TEXT NOT NULL,
  stock_name TEXT NOT NULL DEFAULT '',
  side TEXT NOT NULL,
  qty TEXT NOT NULL,
  cost_price TEXT NOT NULL DEFAULT '',
  market_val TEXT NOT NULL DEFAULT '0',
  pl_ratio TEXT NOT NULL DEFAULT '',
  pl_ratio_valid INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS fills (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES broker_accounts(id),
  deal_id TEXT NOT NULL,
  side TEXT NOT NULL,
  code TEXT NOT NULL,
  stock_name TEXT NOT NULL DEFAULT '',
  qty TEXT NOT NULL,
  price TEXT NOT NULL,
  traded_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS fills_account_deal
  ON fills(account_id, deal_id);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES broker_accounts(id),
  kind TEXT NOT NULL,
  code TEXT NOT NULL,
  stock_name TEXT NOT NULL DEFAULT '',
  side TEXT NOT NULL DEFAULT '',
  qty TEXT NOT NULL DEFAULT '',
  price TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL REFERENCES activities(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL REFERENCES users(id),
  publisher_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS follows_pair
  ON follows(follower_id, publisher_id);

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
