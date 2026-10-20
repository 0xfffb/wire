CREATE TABLE cash_flows (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL,
  broker TEXT NOT NULL,
  external_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('deposit', 'withdraw')),
  amount TEXT NOT NULL,
  currency TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  UNIQUE (broker, external_id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE INDEX cash_flows_account ON cash_flows (account_id, occurred_at);
