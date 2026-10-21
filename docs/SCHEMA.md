# Wire 表设计

D1（SQLite）。配合 [API.md](./API.md)：一台实例一个管理员、一个 SnapTrade 连接、一个纳入账户。数量、价格、市值用十进制**文本**，不存浮点。时间戳存 UTC 毫秒，接口再格式化成北京 `YYYY-MM-DD HH:mm`。

会话仍在 KV，不进 D1。Queue 不要。旧表（`publishers`、`subscriptions`、`cash_flows`、`position_snapshots`、`handle`、`bio_en`）全部丢掉，迁移时重建，不改旧库。

## 一共 9 张表

| 表 | 行数 | 干什么 |
| --- | --- | --- |
| `users` | 0 或 1 | 管理员账号 + 资料 + 公开开关 |
| `settings` | 0 或 1 | SnapTrade Client ID / Consumer Key（加密） |
| `connections` | 0 或 1 | SnapTrade 用户凭证与连接状态 |
| `accounts` | 该连接下列出的账户 | 单选纳入 |
| `snapshots` | 0 或 1 | 最后一次**成功**同步的书头 |
| `cash` | 快照内有余额的货币 | 现金 |
| `positions` | 快照内持仓 | 标的 |
| `orders` | 快照内订单 | 最近订单 |
| `syncs` | 每次任务一条 | 成功和失败都记；断开后仍留 |

```
settings（实例级，与用户无关）
users ──0..1── connections ──*── accounts
  │                                │
  ├──0..1── snapshots ─────────────┘
  │            ├──* cash
  │            ├──* positions
  │            └──* orders
  └──* syncs
```

公开页只读 `snapshots` 及其子表。失败同步只插 `syncs`，不动快照。`connections.status = reauth` 时快照仍在。断开：删连接、账户、快照（级联现金/持仓/订单），**不删** `users` / `syncs`。

占比不落库，读的时候按币种算：该币种持仓市值 ÷（该币种持仓市值合计 + 该币种现金）。

---

## 1. `users`

全站最多一行。`GET /api/setup` 看有没有行。资料和公开开关都在这里，不再拆 `profiles` / `publishers`。

| 列 | 类型 | 说明 |
| --- | --- | --- |
| `id` | TEXT PK | UUID |
| `email` | TEXT UNIQUE | 登录，大小写不敏感 |
| `password_hash` | TEXT | |
| `name` | TEXT | 显示名 |
| `bio` | TEXT | 一份简介，不跟语言切换 |
| `avatar` | TEXT NULL | URL，空则用名字首字 |
| `x` | TEXT NULL | |
| `site` | TEXT NULL | |
| `youtube` | TEXT NULL | |
| `listed` | INTEGER | 公开仓位，默认 0 |
| `show_qty` | INTEGER | 显示数量，默认 0 |
| `show_fills` | INTEGER | 显示订单，默认 1 |
| `created_at` | INTEGER | |

```sql
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
```

没有 `handle`。第二行插入由应用拒绝（`admin_exists`）。

---

## 2. `settings`

全站最多一行，`id` 固定 1。SnapTrade 应用密钥从操作台写入，不进 Worker env。明文只在保存和调用 SnapTrade 时出现，库里只存密文。

| 列 | 类型 | 说明 |
| --- | --- | --- |
| `id` | INTEGER PK | 恒为 1 |
| `snaptrade_client_id_enc` | TEXT NULL | 加密后的 Client ID |
| `snaptrade_consumer_key_enc` | TEXT NULL | 加密后的 Consumer Key |
| `updated_at` | INTEGER | |

```sql
CREATE TABLE settings (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  snaptrade_client_id_enc TEXT,
  snaptrade_consumer_key_enc TEXT,
  updated_at INTEGER NOT NULL
);
```

断开券商不删这行。换密钥只 `UPDATE`。加密密钥仍是 Worker `TOKEN_ENC_KEY`。

---

## 3. `connections`

未连接 = 没有这行。凭证只放这里，不进 KV、不进浏览器。

| 列 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | TEXT PK | → `users.id` |
| `snaptrade_user_id` | TEXT | SnapTrade 侧 user id |
| `user_secret_enc` | TEXT | 加密后的 userSecret，密钥用 `TOKEN_ENC_KEY` |
| `status` | TEXT | `connected` \| `reauth` |
| `updated_at` | INTEGER | |

```sql
CREATE TABLE connections (
  user_id TEXT PRIMARY KEY NOT NULL,
  snaptrade_user_id TEXT NOT NULL,
  user_secret_enc TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('connected', 'reauth')),
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

授权过程中的 portal state / nonce 仍写 KV，过期即删，不建表。

---

## 4. `accounts`

回调后写入 SnapTrade 账户列表。纳入是单选。

| 列 | 类型 | 说明 |
| --- | --- | --- |
| `id` | TEXT PK | 本库 UUID，接口里的 `accountId` |
| `user_id` | TEXT | → `users.id` |
| `external_id` | TEXT | SnapTrade account id |
| `mask` | TEXT | `····1234` |
| `brokerage` | TEXT | 展示名，如 Schwab / Schwab IRA |
| `paper` | INTEGER | `is_paper` 或券商品 `SANDBOX` |
| `included` | INTEGER | 只能有一行是 1 |
| `created_at` | INTEGER | |

```sql
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
```

`PUT /api/admin/connect/account` 先把其它行 `included = 0`，再把目标打 1。回调只刷新列表，不改 `included`（除非 `external_id` 消失则清掉）。

---

## 5. `snapshots`

最后一次成功同步。没有行 = 还没有可公开的仓。失败不同步写这里。

| 列 | 类型 | 说明 |
| --- | --- | --- |
| `id` | TEXT PK | |
| `user_id` | TEXT UNIQUE | 每人一份，替换时先删旧行（级联子表） |
| `account_id` | TEXT | 这份仓来自哪个账户 |
| `synced_at` | INTEGER | 上次成功，接口 `lastOk` |
| `ytd` | TEXT NULL | 不再写入。当前收益读接口时按持仓市值/成本现算 |
| `paper` | INTEGER | 同步时点的实盘/模拟盘，公开页标签跟这份走 |

```sql
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
```

选了新账户但这次同步失败：`accounts.included` 已是新账户，`snapshots` 仍是上一份成功仓。符合「失败不撤数据」。

---

## 6. `cash`

| 列 | 类型 | 说明 |
| --- | --- | --- |
| `snapshot_id` | TEXT | → `snapshots.id` ON DELETE CASCADE |
| `ccy` | TEXT | `USD` / `HKD` … |
| `balance` | TEXT | |

```sql
CREATE TABLE cash (
  snapshot_id TEXT NOT NULL,
  ccy TEXT NOT NULL,
  balance TEXT NOT NULL,
  PRIMARY KEY (snapshot_id, ccy),
  FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE
);
```

余额 ≤ 0 不入库。接口再滤一遍。`weight` 现算。

---

## 7. `positions`

| 列 | 类型 | 说明 |
| --- | --- | --- |
| `snapshot_id` | TEXT | ON DELETE CASCADE |
| `code` | TEXT | `AAPL` / `0700` |
| `ccy` | TEXT | |
| `name` | TEXT | 券商给的名称，一份 |
| `price` | TEXT | 股价 |
| `qty` | TEXT | |
| `value` | TEXT | 市值 |
| `cost` | TEXT | 成本 |

```sql
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
```

不存 `side` / `pl` / `weight`。公开关「显示数量」时接口去掉 `qty` `value` `cost` `pnl` `weight`。盈亏金额和百分比在读时用市值 − 成本；百分比仍返回。

---

## 8. `orders`

每次成功同步**整表替换**该快照下的订单（最近一批，由 SnapTrade 拉回）。

| 列 | 类型 | 说明 |
| --- | --- | --- |
| `id` | TEXT PK | |
| `snapshot_id` | TEXT | ON DELETE CASCADE |
| `external_id` | TEXT | SnapTrade 订单 id，去重 |
| `code` | TEXT | |
| `ccy` | TEXT | |
| `side` | TEXT | `buy` \| `sell` |
| `status` | TEXT | 现网用 `filled` |
| `price` | TEXT | |
| `qty` | TEXT | |
| `amount` | TEXT | 入库时算好，接口不现场乘 |
| `traded_at` | INTEGER | |

```sql
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
```

概览「最近变动」直接读这张表的 `side` / `code` / `traded_at`，不再另做事件表。

---

## 9. `syncs`

Cron 和「选账户时的那一次同步」都写这里。与快照无关，断开后仍可在操作台看到历史。

| 列 | 类型 | 说明 |
| --- | --- | --- |
| `id` | TEXT PK | |
| `user_id` | TEXT | → `users.id` |
| `ok` | INTEGER | |
| `detail` | TEXT | 成功 `ok`；失败如 `reauth_needed`、`snaptrade_unavailable` |
| `finished_at` | INTEGER | 接口里的时间 |

```sql
CREATE TABLE syncs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  ok INTEGER NOT NULL CHECK (ok IN (0, 1)),
  detail TEXT NOT NULL,
  finished_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX syncs_user_finished ON syncs (user_id, finished_at DESC);
```

---

## 读写

| 动作 | 写哪些表 |
| --- | --- |
| 设置管理员 | `INSERT users` |
| 改资料 / 公开开关 | `UPDATE users` |
| 保存 SnapTrade 密钥 | `INSERT/UPDATE settings` |
| 开始连接 | 不写 D1（KV state） |
| 授权回调 | `INSERT/REPLACE connections`，刷新 `accounts`（保留已有 `included`） |
| 纳入账户 | 更新 `accounts.included`，然后跑一次同步 |
| 同步成功 | `INSERT syncs`；删旧 `snapshots`（级联子表）；插入新 `snapshots` + `cash` + `positions` + `orders` |
| 同步失败 | 只 `INSERT syncs`；需要重授权则 `connections.status = reauth` |
| 断开 | 删 `snapshots`（级联）、`accounts`、`connections` |

| 接口 | 读 |
| --- | --- |
| `GET /api/setup` | `users` 是否有行 |
| `GET /api/book` | `users` + `snapshots` + 子表；`listed = 0` 不读仓 |
| `GET /api/me` / profile | `users` |
| `GET /api/admin/overview` | `connections` + `users.listed` + `snapshots` + `orders` |
| `GET /api/admin/connect` | `settings` + `connections` + `accounts` + `snapshots.synced_at` |
| `PUT /api/admin/connect/keys` | 写 `settings` |
| `GET /api/admin/holdings` | `cash` + `positions` |
| `GET /api/admin/orders` | `orders` |
| `GET /api/admin/syncs` | `syncs` |
| `GET /api/admin/share` | `users.listed / show_qty / show_fills` |

## 不算表

| 放哪 | 内容 |
| --- | --- |
| KV | 会话 Cookie、SnapTrade portal 短 state |
| Worker secret | 仅 `TOKEN_ENC_KEY`，用来加密 `settings` 和 `user_secret_enc` |
| 不建 | Queue、发布者、订阅、现金流、持仓历史快照、handle、中英双简介 |
