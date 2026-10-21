CREATE TABLE settings (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  snaptrade_client_id_enc TEXT,
  snaptrade_consumer_key_enc TEXT,
  updated_at INTEGER NOT NULL
);
