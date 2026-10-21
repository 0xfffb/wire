PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS publishers;
DROP TABLE IF EXISTS cash_flows;
DROP TABLE IF EXISTS position_snapshots;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS positions;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS broker_links;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS users;

PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  avatar TEXT,
  x TEXT,
  site TEXT,
  youtube TEXT,
  listed INTEGER NOT NULL DEFAULT 0 CHECK (listed IN (0, 1)),
  show_qty INTEGER NOT NULL DEFAULT 0 CHECK (show_qty IN (0, 1)),
  show_fills INTEGER NOT NULL DEFAULT 1 CHECK (show_fills IN (0, 1)),
  created_at INTEGER NOT NULL,
  UNIQUE (email)
);

CREATE TABLE connections (
  user_id TEXT PRIMARY KEY NOT NULL,
  snaptrade_user_id TEXT NOT NULL,
  user_secret_enc TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('connected', 'reauth')),
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  mask TEXT NOT NULL DEFAULT '',
  brokerage TEXT NOT NULL DEFAULT '',
  paper INTEGER NOT NULL DEFAULT 0 CHECK (paper IN (0, 1)),
  included INTEGER NOT NULL DEFAULT 0 CHECK (included IN (0, 1)),
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, external_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX accounts_user ON accounts (user_id);
CREATE UNIQUE INDEX accounts_one_included ON accounts (user_id) WHERE included = 1;

CREATE TABLE snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  synced_at INTEGER NOT NULL,
  ytd TEXT,
  paper INTEGER NOT NULL DEFAULT 0 CHECK (paper IN (0, 1)),
  UNIQUE (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE cash (
  snapshot_id TEXT NOT NULL,
  ccy TEXT NOT NULL,
  balance TEXT NOT NULL,
  PRIMARY KEY (snapshot_id, ccy),
  FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
);

CREATE TABLE positions (
  snapshot_id TEXT NOT NULL,
  code TEXT NOT NULL,
  ccy TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  price TEXT NOT NULL,
  qty TEXT NOT NULL,
  value TEXT NOT NULL,
  cost TEXT NOT NULL,
  PRIMARY KEY (snapshot_id, code, ccy),
  FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY NOT NULL,
  snapshot_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  code TEXT NOT NULL,
  ccy TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  status TEXT NOT NULL CHECK (status IN ('open', 'partial', 'filled', 'cancelled', 'rejected')),
  price TEXT NOT NULL,
  qty TEXT NOT NULL,
  amount TEXT NOT NULL,
  traded_at INTEGER NOT NULL,
  UNIQUE (snapshot_id, external_id),
  FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
);

CREATE INDEX orders_snapshot_traded ON orders (snapshot_id, traded_at DESC);

CREATE TABLE syncs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  ok INTEGER NOT NULL CHECK (ok IN (0, 1)),
  detail TEXT NOT NULL,
  finished_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX syncs_user_finished ON syncs (user_id, finished_at DESC);
