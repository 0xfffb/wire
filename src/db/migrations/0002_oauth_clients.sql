CREATE TABLE IF NOT EXISTS oauth_clients (
  broker TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  registration_access_token_enc TEXT NOT NULL DEFAULT ''
);
