# Wire

[English](../README.md) | **简体中文**

基于 Cloudflare Workers（D1、KV）的自托管持仓页。一台实例一份仓。公开页 `/`，操作台 `/admin`。券商数据来自 SnapTrade 个人 API 密钥。

## 功能

- 公开持仓页和操作台（连接、持仓、订单、同步记录、公开范围、资料）
- 一个管理员，第一次访问时创建；只能纳入一个券商账户
- 每天 UTC `0 8 * * *` 拉一次快照；公开页只展示上次成功同步
- 公开开关：公开仓位、显示数量、显示订单（关数量时接口也不返回数量）
- 占比含现金、按币种、不换汇；当前收益和单行盈亏
- 中 / 英，浅色 / 深色 / 跟随系统

## 支持的券商

连接走 [SnapTrade Personal](https://snaptrade.com/personal)。Wire 不直连券商。在 SnapTrade 门户授权后，纳入其中一个账户。

SnapTrade 接 40 多家，包括 Schwab、Fidelity、Robinhood、Interactive Brokers、E*TRADE、Vanguard、Webull、moomoo、Wealthsimple、Questrade、Coinbase、Kraken。完整名单见 [SnapTrade Brokerage Integrations](https://snaptrade.com/brokerage-integrations)。

## 环境

- Node.js 20+
- Cloudflare 账号
- [SnapTrade](https://snaptrade.com/personal) 个人 API 密钥

## 开发

```bash
npm i
npx wrangler login
npm run setup
npm run build:web
npm run dev
```

`http://localhost:8787`。`TOKEN_ENC_KEY` 从 `.dev.vars` 读取（`npm run setup` 会从 `.dev.vars.example` 生成）。

## 部署

```bash
npm run deploy
npx wrangler secret put TOKEN_ENC_KEY
```

首次部署会创建 D1 和 KV。不要提交资源 ID 或密钥。Cron：`0 8 * * *` UTC。

## 文档

- [接口](API.md)
- [表结构](SCHEMA.md)
- [设计](DESIGN.md)

## 许可

[MIT](../LICENSE)
