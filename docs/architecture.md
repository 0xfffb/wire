# 仓位分享平台

> 产品已改成个人持仓实例。界面见 [DESIGN.md](./DESIGN.md)，接口见 [API.md](./API.md)。不要再按本文做多发布者、订阅、Queue 或富途。下文是旧平台记录，实现前以 API.md 为准。

发布者用券商 OAuth 授权只读账户，平台定时同步持仓与成交，并按披露策略发布。订阅者只阅读平台上的快照、变动和记录。第一家券商适配富途 OpenAPI。

## 约束

| 项 | 约定 |
| --- | --- |
| 授权范围 | 只申请 `trade:read` |
| access token | 约 2 小时（7200 秒） |
| 历史成交 | 单次查询窗口约 90 天，每页最多 50 条 |
| 订阅者看到的数据 | 平台快照与读模型，不直连券商 |
| 数据库 | Cloudflare D1（SQLite）；经 `SqlDatabase` 端口访问，不直绑 D1 API |

`trade:read` 覆盖授权账户、持仓和历史成交。`trade:write` 包含下单和撤单，平台不申请、不保存。refresh token 加密存放。订阅接口不接触券商凭证。

收益展示标明来自券商同步时点，并附上非投资建议说明。跟单、信号下单和代客交易不在这个产品里。

## 角色

### 发布者

在平台注册后绑定富途。授权页登录并确认范围，回调换 token，选择要公开的业务账户。同步任务拉取持仓和成交。发布者设置可见字段、延迟和受众。

### 订阅者

在发现页按市场、收益率和每月订阅金额筛选账户。主页先展示简介、涨跌幅、收益率和月费。订阅开通 30 天，期间可以查看仓位、交易记录和 Webhook，到期后需要再订。内容来自平台库。

同一个人可以既是发布者，也是订阅者。

## 主路径

1. 发布者登录平台，得到平台身份。
2. 浏览器跳转富途授权。服务端会话保存 PKCE 的 `state` 与 `code_verifier`。
3. 富途回调带回一次性 `code`，5 分钟内换成 token。
4. 发布者从 `authorized_trd_accs` 里勾选要同步的 `acc_id`。
5. 同步任务做首次同步：写入持仓快照，并回补成交。
6. 定时任务刷新 token，全量拉取持仓，按 `deal_id` 增量拉取成交。
7. 领域层对比快照，生成新建、加仓、减仓、清仓。
8. 订阅者按关注关系和披露策略读取裁剪后的读模型。

富途接口：

- 授权：OAuth 2.1 + PKCE，`https://webapi.futunn.com`
- 授权账户：`GET /api/v1.0/accounts/authorized_trd_accs`
- 持仓：`GET /api/v1.0/accounts/{acc_id}/positions`
- 历史成交：`GET /api/v1.0/accounts/{acc_id}/fills_history`

access token 过期后用 refresh token 换新令牌。刷新失败则把连接标为需要重新授权，并停止公开新快照。已发布内容保留上次成功同步的时间。

## 技术栈

| 层 | 选择 |
| --- | --- |
| 运行时 | Cloudflare Workers（API + 静态资源同 Worker） |
| 语言 | TypeScript |
| API | Hono（`/api/*`） |
| 前端 | Astro（`output: static`）+ React islands；产物 `web/dist` → Workers Assets。界面约定见 [DESIGN.md](./DESIGN.md) |
| 主库 | D1，经 `SqlDatabase`；表结构用 `src/db/migrations` SQL |
| 旁路存储 | KV（`KvStore`）；队列（`Queue`，可选） |
| 支付 | Stripe（`Payment` 端口） |
| 券商 | Futu / SnapTrade（`Brokerage` 端口） |
| 请求校验 | Zod |
| 同步 | Cron `dispatch-sync` → Queue → `sync-holdings` |

浏览器只拿会话 Cookie。券商 token 留在服务端主库。

**迁移约定**：`src/` 业务层不出现 `env.*`；平台与第三方只在 `src/adapters/`。

```text
wire/
├── src/
│   ├── app.ts / deps.ts
│   ├── routes/ services/ jobs/ ports/ middleware/ schemas/
│   ├── db/migrations/ # D1 SQL
│   └── adapters/
│       ├── cloudflare/    # fetch / scheduled / queue + D1/KV/Queue/Crypto
│       ├── brokers/
│       └── stripe/
├── web/               # Astro → dist → [assets]
├── test/fakes/
├── wrangler.jsonc
└── package.json       # workspaces: ["web"]
```

## 架构

```
浏览器
  ├─ 页面 → Workers Assets（Astro dist）
  └─ /api/* → Hono（run_worker_first）
cron / queue → jobs → services
Deps ← adapters/cloudflare/make-deps
```

发布者浏览器只访问本平台的 `web/publisher` 和 `api`。跳转富途授权页是唯一一次离开本站。回调回到 `web/oauth`，页面不解析持仓，只把 `code` 和 `state` 交给 api。token 不下发到浏览器。

| 模块 | 职责 | 不负责 |
| --- | --- | --- |
| web/publisher | 发布者登录后的控制台 | 保存 token、直接调用券商 |
| web/public | 订阅者主页、关注列表 | 展示未披露的数量和账户号 |
| web/oauth | 接收富途回调并交给 api | 展示仓位 |
| api | 会话、资料、披露、订阅读接口、发布者私有读接口 | 定时拉取 |
| sync | 刷新令牌、拉取、归一化、快照 diff | 对订阅者鉴权 |
| broker/futu | 富途请求与字段映射 | 决定哪些字段公开 |
| token vault | 加密保管并轮换 refresh token | 把凭证返回给前端 |

同步任务写入原始持仓、原始成交和归一化事件。订阅接口只查发布读模型：当前仓位、仓位事件、成交记录、发布者备注。原始表保留账户标识和精确数量。读模型在查询时按策略投影成占比、方向和允许公开的盈亏。

发布者控制台另有一条私有读接口：返回本人已同步的数量、成本、市值和账户掩码。这条接口要求发布者会话，不走订阅读模型。

## 发布者 Web

发布者使用登录后的控制台。左侧导航固定为：概览、券商、持仓、记录、披露、主页预览。顶栏显示当前券商连接状态，并提供手动同步。未连接券商时，除券商页外的导航进入空状态，引导去授权。

```
/login                      登录 / 注册
/oauth/futu/callback        富途回调，交给 api 后进入选账户
/publisher                  概览
/publisher/broker           连接、账户勾选、重新授权
/publisher/holdings         本人持仓（含数量与市值）
/publisher/activity         本人成交与仓位变动
/publisher/share            披露策略
/publisher/preview          订阅者将看到的主页
```

| 页面 | 界面内容 | 调用的平台接口 |
| --- | --- | --- |
| 概览 | 连接状态、上次成功同步时间、失败原因、纳入分享的账户数、持仓标的数、今日变动条数 | 连接状态、最近一次同步结果 |
| 券商 | 富途授权按钮、授权范围说明（只读）、账户列表与勾选、重新授权 | 发起授权、账户列表、更新纳入分享的账户 |
| 持仓 | 按账户筛选的表格：标的、方向、数量、成本、市值、盈亏比例。标明同步时点 | 发布者私有持仓 |
| 记录 | 时间线：成交与新建、加仓、减仓、清仓。可写备注 | 发布者私有变动、保存备注 |
| 披露 | 主页公开或仅关注者；是否展示成本、成交价格、成交数量 | 读取和更新 SharePolicy |
| 主页预览 | 与订阅者主页同一套版式，数据来自披露后的读模型 | 发布读模型，身份为本人 |

持仓页和记录页展示发布者自己的精确数据。主页预览展示披露后的占比和字段开关结果。两套数据分属两个接口，页面不在浏览器里用精确数量换算公开占比。

券商页在授权回来后先列出账户，发布者勾选并确认后才触发首次同步。同步进行时概览和持仓页显示进行中；失败时顶栏保持上次成功时间，并给出重新授权入口。

### 第一期页面

订阅者页面仍是公开站点，不放进发布者控制台。

| 页面 | 使用者 | 主要动作 |
| --- | --- | --- |
| 登录 / 注册 | 所有人 | 建立平台身份 |
| 发布者控制台 | 发布者 | 连接券商、查看持仓与记录、设置披露、预览主页 |
| 发现 / 主页 | 订阅者 | 查看仓位表、变动时间线，并关注 |
| 关注列表 | 订阅者 | 回到已关注的发布者 |

## 数据

主库使用 Cloudflare D1（SQLite 方言）。数量、价格、市值沿用券商返回的十进制字符串，不存浮点数。`Fill.deal_id` 加唯一约束做成交去重。表结构用 `src/db/migrations` 管理，由 Wrangler D1 migrations 应用。

加密后的 refresh token 存在 `BrokerConnection` 表。访问收口在仓储层（经 `SqlDatabase`），页面和券商适配器不直接写 SQL，也不直接使用 `env.DB` / `env.KV`。

| 对象 | 关键内容 | 可见性 |
| --- | --- | --- |
| User | 平台身份。一个人可发布也可订阅 | 本人 |
| PublisherProfile | 显示名、简介、主页可见性 | 按主页设置 |
| BrokerConnection | 券商、scope、加密 token、授权状态、上次同步 | 仅发布者与同步任务 |
| BrokerAccount | `acc_id`、市场、是否纳入分享 | 卡号只对发布者显示掩码 |
| PositionSnapshot | 某次同步的全量持仓 | 内部 |
| HoldingView | 标的、方向、占比、盈亏比例、成本开关 | 订阅者 |
| Fill | `deal_id`、买卖、价格、数量、时间 | 内部，按 `deal_id` 去重 |
| Activity | 新建、加仓、减仓、清仓，或一条成交 | 订阅者，可延迟 |
| Note | 发布者对某次变动写的说明 | 随记录一起公开 |
| Follow | 订阅者与发布者的关注关系 | 双方 |
| SharePolicy | 受众、延迟、字段开关、纳入的账户 | 发布者可改，订阅者只感受结果 |

### 富途同步规则

| 数据 | 接口行为 | 平台处理 |
| --- | --- | --- |
| 账户 | `GET /accounts/authorized_trd_accs`，无参数 | 列出账户后让发布者勾选。未勾选的不入库为公开持仓 |
| 持仓 | 按 `acc_id` 全量返回，含数量、成本、市值、盈亏 | 每次成功同步生成快照，与上一份快照对比生成仓位事件 |
| 成交 | `fills_history` 必填市场和 `page_flag`，单次跨度最多约 90 天，每页最多 50 条 | 按市场分页回补，用 `deal_id` 做幂等，游标记到连接上 |

### 默认披露

未订阅只看到简介、按持仓成本加权的收益率和订阅金额。日内涨跌幅还没有行情序列，列表里先留空。订阅后看到数量、市值、占比、现金、成交和自己登记的 Webhook 地址。账户号只显示掩码。价格仍由发布者单独打开。

## 功能范围

| 阶段 | 交付 | 完成标准 |
| --- | --- | --- |
| P0 授权与同步 | 平台账号、发布者控制台的券商页与概览、富途 OAuth、选账户、手动同步、持仓快照与成交入库 | 同一 `deal_id` 不重复；token 刷新失败有明确状态 |
| P1 可阅读 | 发布者持仓页、记录页、主页预览，以及订阅者主页和关注 | 订阅者看不到 `acc_id`、token 和未授权账户；发布者私有页与预览页数据来源分开 |
| P2 披露 | 占比换算、字段开关、公开 / 仅关注者、同步频率与失败告警 | 改策略后旧快照按新规则投影，原始数据保留 |
| P3 扩展 | 延迟公开、收益曲线、备注、通知、第二家券商适配器 | 新券商继承 `Broker` 并注册，读模型不变 |
