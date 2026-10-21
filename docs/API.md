# Wire 接口

个人持仓实例：一台一份仓，一个管理员。浏览器只打本文件里的 `/api/*`；券商 token 不出浏览器。界面见 [DESIGN.md](./DESIGN.md)，表见 [SCHEMA.md](./SCHEMA.md)。

**不要保留 Queue。** 同步量很小，Cron 里直接拉 SnapTrade 即可。SnapTrade 用**个人密钥**（Client ID / Consumer Key），在操作台连接页保存，加密进 D1；不要走 Commercial 的 `registerUser`。Worker 只保留 `TOKEN_ENC_KEY`。

## 约定

| 项 | 约定 |
| --- | --- |
| 前缀 | `/api/*` 由 Worker 先处理；静态页走 Assets |
| 会话 | Cookie，`credentials: include`。除标明「公开」的接口外，操作台接口都要登录 |
| 错误 | `{ "error": "<code>" }`。`invalid_body` 400，`unauthorized` 401，`conflict` / `admin_exists` / `reauth` 409，未配置密钥 `snaptrade_unconfigured` 503，券商失败 `snaptrade_unavailable` 502 |
| 数字 | 十进制字符串，不发浮点。时间 `YYYY-MM-DD HH:mm`（北京） |
| 占比 | 服务端按币种算，含现金，不换汇。USD 仓 + USD 现金 = 100%；HKD 同理 |
| 快照 | 公开页只读最后一次**成功**同步。失败不撤数据 |
| 券商 | 只接 SnapTrade。纳入账户是单选，只能一个 |
| 同步 | 只有 Cron，没有手动同步接口，没有 Queue |
| 缓存 | `GET /api/book`、`/api/setup`、`/api/health` 用 Workers Cache API，短 TTL。改资料、分享、断开或同步成功后清掉。操作台与登录接口 `private, no-store` |

公开页「显示数量」关着时，**接口也不返回**数量 / 市值 / 成本 / 盈亏金额 / 占比 / 订单数量与金额，不能只靠前端模糊。现金余额、现金占比、股价、当前收益、单行盈亏百分比始终返回。

## 页面 ↔ 接口

| 页面 | 接口 |
| --- | --- |
| `/` | `GET /api/setup`，`GET /api/book` |
| `/login` 设置管理员 | `GET /api/setup`，`POST /api/auth/setup` |
| `/login` 登录 | `GET /api/setup`，`POST /api/auth/login`。已有会话则 Worker 302 `/admin` |
| 操作台 | 公开页「操作台」进 `/admin`。未登录 Worker 302 `/login`；页面上 `GET /api/me` 401 仍回 `/login` |
| `/admin` 概览 | `GET /api/admin/overview` |
| `/admin/connect` | 一行 SnapTrade：连接和配置。`GET /api/admin/connect`，`PUT /api/admin/connect/keys`（`#keys`），`POST` 连接 / 重连，`DELETE` 断开，`PUT /api/admin/connect/account` |
| `/admin/holdings` | `GET /api/admin/holdings` |
| `/admin/activity` | `GET /api/admin/orders` |
| `/admin/sync` | `GET /api/admin/syncs` |
| `/admin/public` | `GET` / `PUT /api/admin/share` |
| `/admin/profile` | `GET` / `PATCH /api/admin/profile` |
| 退出 | `POST /api/auth/logout` |

SnapTrade 授权回来走 `GET /oauth/snaptrade/callback`（重定向，不是 JSON）。

---

## 公开

### `GET /api/health`

`{ "ok": true }`

### `GET /api/setup`

这台实例有没有管理员。给登录页决定设置 / 登录，也给 `/` 以后做首访跳转。

```json
{ "admin": false }
```

`admin: false`：还没有用户。`true`：已经有唯一管理员。不返回邮箱。

### `GET /api/book`

访客公开仓。不登录。

未公开时只给资料：

```json
{
  "listed": false,
  "profile": {
    "name": "木兰",
    "bio": "美股为主，港股做底仓。记录自己的仓，不是信号。",
    "avatar": null,
    "x": "https://x.com/amu",
    "site": "https://amu.example.com",
    "youtube": null
  }
}
```

已公开、尚无成功快照：上面的 `profile` + `"listed": true` + `"snapshot": null`。

已公开且有成功快照：

```json
{
  "listed": true,
  "showQty": false,
  "showFills": true,
  "profile": {
    "name": "木兰",
    "bio": "…",
    "avatar": null,
    "x": "https://x.com/amu",
    "site": "https://amu.example.com",
    "youtube": null,
    "paper": false
  },
  "snapshot": {
    "lastOk": "2026-10-21 10:04",
    "ytd": "+4.04%",
    "cash": [
      { "ccy": "USD", "balance": "8240.12", "weight": "17%" },
      { "ccy": "HKD", "balance": "21500.00", "weight": "24%" }
    ],
    "holdings": [
      {
        "code": "AAPL",
        "name": "Apple",
        "ccy": "USD",
        "price": "186.25",
        "qty": "80",
        "value": "14900",
        "cost": "13800",
        "pnl": "+1100.00",
        "pnlPct": "+7.97%",
        "weight": "31%"
      }
    ],
    "orders": [
      {
        "code": "NVDA",
        "side": "buy",
        "ccy": "USD",
        "price": "355.00",
        "qty": "10",
        "amount": "3550",
        "status": "filled",
        "time": "2026-10-21 09:41"
      }
    ]
  }
}
```

规则：

- `paper`：纳入账户为模拟盘（SnapTrade `is_paper` 或券商品 `SANDBOX`）时 `true`，公开页用黄标签；否则实盘绿。
- `showQty: false` 时，`holdings[]` 不包含 `qty` / `value` / `cost` / `pnl` / `weight`；`orders[]` 不包含 `qty` / `amount`。`pnlPct` 仍返回。现金行仍带 `balance`、`weight`。
- `showFills: false` 时不返回 `orders`。
- `cash` 只列余额 > 0 的货币。
- `ytd` 是当前收益：各币种（市值 − 成本）/ 成本，不含现金、不换汇。一种货币只写 `+4.04%`；多种则 `USD +4.04% · HKD +2.10%`。没有持仓或成本为 0 则 `null`。
- `pnl` 是该行市值 − 成本，带正负号。`pnlPct` 是相对成本的百分比。

---

## 认证

全站只有一个管理员。设好后 `POST /api/auth/setup` 永久 409。

### `POST /api/auth/setup`

```json
{ "email": "a@b.com", "password": "********", "confirm": "********" }
```

成功 `201`，写入会话 Cookie，返回与 `GET /api/me` 相同的用户。已有管理员：`409 { "error": "admin_exists" }`。密码不一致：`400 { "error": "password_mismatch" }`。

不再要 `handle`。不再开放 `POST /api/auth/register`。

### `POST /api/auth/login`

```json
{ "email": "a@b.com", "password": "********" }
```

成功返回 `me`。失败 `401 { "error": "invalid_credentials" }`。还没有管理员：`409 { "error": "no_admin" }`。

### `POST /api/auth/logout`

`{ "ok": true }`，清 Cookie。要登录。

### `GET /api/me`

当前管理员。未登录 `401`。

```json
{
  "id": "…",
  "email": "a@b.com",
  "name": "木兰",
  "bio": "…",
  "avatar": null,
  "x": "https://x.com/amu",
  "site": "https://amu.example.com",
  "youtube": null
}
```

---

## 操作台

以下均要会话。未登录 `401`。

### `GET /api/admin/overview`

```json
{
  "status": "connected",
  "source": "SnapTrade",
  "listed": true,
  "configured": true,
  "ytd": "+4.04%",
  "lastOk": "2026-10-21 10:04",
  "activity": [
    { "side": "buy", "code": "NVDA", "time": "2026-10-21 09:41" },
    { "side": "sell", "code": "AAPL", "time": "2026-10-20 15:02" }
  ]
}
```

`status`：`disconnected` | `connected` | `reauth`。未连接时 `ytd` / `lastOk` 为 `null`，`activity` 空数组。`reauth` 仍给上次成功快照对应的 `lastOk`、`ytd`、`activity`。`ytd` 与公开页相同，按持仓现算。活动只列买入 / 卖出，不加仓位事件。`configured: false` 时概览「去连接」进 `/admin/connect#keys`。

### `GET /api/admin/connect`

```json
{
  "status": "connected",
  "configured": true,
  "clientId": "SNAPTRADE-CLIENT",
  "lastOk": "2026-10-21 10:04",
  "accounts": [
    {
      "id": "acc_1",
      "mask": "····1234",
      "brokerage": "Schwab",
      "paper": false,
      "included": true
    },
    {
      "id": "acc_2",
      "mask": "····8890",
      "brokerage": "Schwab IRA",
      "paper": true,
      "included": false
    }
  ]
}
```

未连接：`status: "disconnected"`，`accounts: []`，`lastOk: null`。`configured: false` 表示还没有保存 Client ID / Consumer Key，连接页点「连接」或概览「去连接」进配置。`clientId` 给表单回填；**不返回** Consumer Key，已配置时前端用星号占位。

### `PUT /api/admin/connect/keys`

在连接页保存 SnapTrade 密钥。用 `TOKEN_ENC_KEY` 加密后写入 `settings`。

```json
{ "clientId": "SNAPTRADE-CLIENT", "consumerKey": "…" }
```

第一次必须带 `clientId` 和 `consumerKey`。之后 `consumerKey` 可省略，表示不改。成功 `{ "configured": true, "clientId": "…" }`。缺密钥 `503 { "error": "snaptrade_unconfigured" }`。GET 永不回 Consumer Key。

### `POST /api/admin/connect`

开始连接或重新授权。返回 SnapTrade Connection Portal：

```json
{ "url": "https://…" }
```

浏览器跳转该 `url`。未配置密钥：`503 { "error": "snaptrade_unconfigured" }`。SnapTrade 不可用：`502 { "error": "snaptrade_unavailable" }`。

### `GET /oauth/snaptrade/callback`

SnapTrade 回来。换凭证、拉账户列表，**不**自动纳入、**不**自动同步。然后 302 到 `/admin/connect`。未登录 302 `/login`。失败带 `?error=`。

### `PUT /api/admin/connect/account`

纳入唯一账户。会在本请求里做一次同步（仍无 Queue、无手动同步按钮）。

```json
{ "accountId": "acc_1" }
```

成功返回与 `GET /api/admin/connect` 相同的结构，且只有这一条 `included: true`。未连接 `409 { "error": "disconnected" }`。需要重新授权 `409 { "error": "reauth" }`。同步失败仍保存纳入选择，并写一条失败同步记录；连接状态按 SnapTrade 结果更新。

### `DELETE /api/admin/connect`

断开 SnapTrade。公开页不再有快照。同步记录可留。返回 `status: "disconnected"` 的 connect 视图。

### `GET /api/admin/holdings`

操作台完整数字，不受「显示数量」影响。无快照：`{ "cash": [], "holdings": [] }`。

```json
{
  "cash": [
    { "ccy": "USD", "balance": "8240.12", "weight": "17%" }
  ],
  "holdings": [
    {
      "code": "AAPL",
      "name": "Apple",
      "ccy": "USD",
      "price": "186.25",
      "qty": "80",
      "value": "14900",
      "cost": "13800",
      "pnl": "+1100.00",
      "pnlPct": "+7.97%",
      "weight": "31%"
    }
  ]
}
```

### `GET /api/admin/orders`

```json
{
  "orders": [
    {
      "code": "NVDA",
      "side": "buy",
      "ccy": "USD",
      "price": "355.00",
      "qty": "10",
      "amount": "3550",
      "status": "filled",
      "time": "2026-10-21 09:41"
    }
  ]
}
```

### `GET /api/admin/syncs`

```json
{
  "syncs": [
    { "time": "2026-10-21 10:04", "ok": true, "detail": "ok" },
    { "time": "2026-10-19 14:22", "ok": false, "detail": "reauth_needed" }
  ]
}
```

`detail` 成功一律 `ok`；失败写原因码，例如 `reauth_needed`、`snaptrade_unavailable`。时间是这次任务结束时点，不是「今天」。

### `GET /api/admin/share`

```json
{ "listed": false, "showQty": false, "showFills": true }
```

### `PUT /api/admin/share`

任意字段可选，未给的保持原值。

```json
{ "listed": true, "showQty": false, "showFills": true }
```

返回完整 share。默认：仓位不公开，不显示数量，显示订单。

### `GET /api/admin/profile`

与 `GET /api/me` 的资料字段相同（`name` / `bio` / `avatar` / `x` / `site` / `youtube`）。简介只有一份，不跟语言切换。

### `PATCH /api/admin/profile`

```json
{
  "name": "木兰",
  "bio": "…",
  "avatar": null,
  "x": "https://x.com/amu",
  "site": "https://amu.example.com",
  "youtube": null
}
```

空字符串当清除。返回更新后的 profile。

---

## Scheduler

不是 HTTP。Worker `scheduled` 里**直接**跑同步，不入队。

| Cron（UTC） | 做什么 |
| --- | --- |
| `0 8 * * *`（北京 16:00） | 刷新纳入账户：持仓、现金、订单；写同步记录。当前收益读时按市值/成本计算 |

没有管理员、未连接、或没有纳入账户时，Cron 空跑。授权失效：标 `reauth`，公开页仍用上次成功快照，并记一条失败。

去掉：

- Queue binding、`queue()` handler、`src/storage/queue`、`src/jobs/consumer`
- `*/31 * * * *` 刷富途 token
- `POST /api/user/broker/sync` 及任何手动同步接口

选账户时的那一次同步走 `PUT /api/admin/connect/account` 请求内，不走 Cron、不走 Queue。

KV 只留会话。个人密钥加密进 D1。

---

## 不要再提供

| 旧接口 | 原因 |
| --- | --- |
| `POST /api/auth/register` | 改成一次性 `setup` |
| `GET /api/users`、`GET /api/users/:handle` | 没有发现 / 多主页 |
| `GET /api/subscriptions` | 没有订阅 |
| `GET/POST /api/user/apply*` | 没有发布者申请 |
| `GET /oauth/futu/callback` | 只接 SnapTrade |
| `POST /api/user/broker/sync` | 不同步按钮 |
| `/users/:handle` 服务端壳 | 公开页就是 `/` |
| Stripe / 月费 | 不做 |

旧 `/api/user/*` 控制台路径一并换成上面的 `/api/admin/*` 与 `/api/me`。
