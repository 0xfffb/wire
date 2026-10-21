-- KV（不进 D1）broker:{userId}:{broker}
-- { refreshTokenEnc, accessTokenEnc, status, lastSyncAt, lastError, cursors }

CREATE TABLE broker_links (
  user_id TEXT NOT NULL,
  broker TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, broker),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE accounts (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  broker TEXT NOT NULL,
  external_id TEXT NOT NULL,
  card_mask TEXT NOT NULL DEFAULT '',
  markets TEXT NOT NULL DEFAULT '[]',
  included INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  UNIQUE (broker, external_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE positions (
  account_id TEXT NOT NULL,
  code TEXT NOT NULL,
  currency TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  side TEXT NOT NULL CHECK (side IN ('long', 'short', 'flat')),
  qty TEXT NOT NULL,
  cost TEXT NOT NULL,
  value TEXT NOT NULL,
  pl TEXT NOT NULL DEFAULT '—',
  as_of INTEGER NOT NULL,
  PRIMARY KEY (account_id, code, currency),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE position_snapshots (
  account_id TEXT NOT NULL,
  synced_at INTEGER NOT NULL,
  code TEXT NOT NULL,
  currency TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  side TEXT NOT NULL CHECK (side IN ('long', 'short', 'flat')),
  qty TEXT NOT NULL,
  cost TEXT NOT NULL,
  value TEXT NOT NULL,
  pl TEXT NOT NULL DEFAULT '—',
  PRIMARY KEY (account_id, synced_at, code, currency),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL,
  broker TEXT NOT NULL,
  external_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'partial', 'filled', 'cancelled', 'rejected')),
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  code TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL,
  qty TEXT NOT NULL,
  filled_qty TEXT NOT NULL DEFAULT '0',
  price TEXT NOT NULL,
  traded_at INTEGER NOT NULL,
  UNIQUE (broker, external_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE INDEX orders_account_traded ON orders (account_id, traded_at DESC);
CREATE INDEX positions_account ON positions (account_id);
CREATE INDEX snapshots_account ON position_snapshots (account_id, synced_at DESC);
CREATE INDEX accounts_user ON accounts (user_id);
