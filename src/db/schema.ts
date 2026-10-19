import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: integer("expires_at").notNull(),
});

export const publisherProfiles = sqliteTable("publisher_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  handle: text("handle").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio").notNull().default(""),
});

export const sharePolicies = sqliteTable("share_policies", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  audience: text("audience").notNull().default("public"),
  showCost: integer("show_cost").notNull().default(0),
  showFillPrice: integer("show_fill_price").notNull().default(0),
  showFillQty: integer("show_fill_qty").notNull().default(0),
  delayMinutes: integer("delay_minutes").notNull().default(0),
  subscribeAmount: text("subscribe_amount").notNull().default("0"),
});

export const oauthClients = sqliteTable("oauth_clients", {
  broker: text("broker").primaryKey(),
  clientId: text("client_id").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  registrationAccessTokenEnc: text("registration_access_token_enc").notNull().default(""),
});

export const brokerConnections = sqliteTable("broker_connections", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  broker: text("broker").notNull(),
  status: text("status").notNull(),
  scope: text("scope").notNull().default(""),
  accessTokenEnc: text("access_token_enc"),
  refreshTokenEnc: text("refresh_token_enc"),
  accessExpiresAt: integer("access_expires_at"),
  lastSyncAt: integer("last_sync_at"),
  lastError: text("last_error"),
  fillCursor: text("fill_cursor").notNull().default("{}"),
});

export const brokerAccounts = sqliteTable(
  "broker_accounts",
  {
    id: text("id").primaryKey(),
    connectionId: text("connection_id")
      .notNull()
      .references(() => brokerConnections.id),
    accId: text("acc_id").notNull(),
    cardMask: text("card_mask").notNull().default(""),
    markets: text("markets").notNull().default("[]"),
    included: integer("included").notNull().default(0),
    cash: text("cash").notNull().default(""),
    totalAssets: text("total_assets").notNull().default(""),
    fundsCurrency: text("funds_currency").notNull().default(""),
    fundsJson: text("funds_json").notNull().default("[]"),
  },
  (table) => [uniqueIndex("broker_accounts_connection_acc").on(table.connectionId, table.accId)],
);

export const oauthStates = sqliteTable("oauth_states", {
  state: text("state").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  codeVerifier: text("code_verifier").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export const positionSnapshots = sqliteTable("position_snapshots", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => brokerAccounts.id),
  syncedAt: integer("synced_at").notNull(),
});

export const positions = sqliteTable("positions", {
  id: text("id").primaryKey(),
  snapshotId: text("snapshot_id")
    .notNull()
    .references(() => positionSnapshots.id),
  code: text("code").notNull(),
  stockName: text("stock_name").notNull().default(""),
  side: text("side").notNull(),
  qty: text("qty").notNull(),
  costPrice: text("cost_price").notNull().default(""),
  marketVal: text("market_val").notNull().default("0"),
  plRatio: text("pl_ratio").notNull().default(""),
  plRatioValid: integer("pl_ratio_valid").notNull().default(0),
  currency: text("currency").notNull().default(""),
});

export const fills = sqliteTable(
  "fills",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id")
      .notNull()
      .references(() => brokerAccounts.id),
    dealId: text("deal_id").notNull(),
    side: text("side").notNull(),
    code: text("code").notNull(),
    stockName: text("stock_name").notNull().default(""),
    qty: text("qty").notNull(),
    price: text("price").notNull(),
    tradedAt: integer("traded_at").notNull(),
  },
  (table) => [uniqueIndex("fills_account_deal").on(table.accountId, table.dealId)],
);

export const activities = sqliteTable("activities", {
  id: text("id").primaryKey(),
  accountId: text("account_id")
    .notNull()
    .references(() => brokerAccounts.id),
  kind: text("kind").notNull(),
  code: text("code").notNull(),
  stockName: text("stock_name").notNull().default(""),
  side: text("side").notNull().default(""),
  qty: text("qty").notNull().default(""),
  price: text("price").notNull().default(""),
  createdAt: integer("created_at").notNull(),
});

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  activityId: text("activity_id")
    .notNull()
    .references(() => activities.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const webhooks = sqliteTable("webhooks", {
  id: text("id").primaryKey(),
  followerId: text("follower_id")
    .notNull()
    .references(() => users.id),
  publisherId: text("publisher_id")
    .notNull()
    .references(() => users.id),
  url: text("url").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const follows = sqliteTable(
  "follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id),
    publisherId: text("publisher_id")
      .notNull()
      .references(() => users.id),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull().default(0),
  },
  (table) => [uniqueIndex("follows_pair").on(table.followerId, table.publisherId)],
);
