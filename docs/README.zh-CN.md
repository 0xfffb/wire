# Wire

[English](../README.md) | **简体中文**

基于 Cloudflare Workers（D1、KV）的自托管持仓页。一台实例一份仓。公开页 `/`，操作台 `/admin`。券商数据来自 SnapTrade 个人 API 密钥。

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
