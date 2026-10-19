ALTER TABLE broker_accounts ADD COLUMN cash TEXT NOT NULL DEFAULT '';
ALTER TABLE broker_accounts ADD COLUMN total_assets TEXT NOT NULL DEFAULT '';
ALTER TABLE broker_accounts ADD COLUMN funds_currency TEXT NOT NULL DEFAULT '';
ALTER TABLE broker_accounts ADD COLUMN funds_json TEXT NOT NULL DEFAULT '[]';
