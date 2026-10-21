# Wire

**English** | [简体中文](docs/README.zh-CN.md)

Self-hosted holdings page on Cloudflare Workers (D1, KV). One instance, one book. Public site at `/`; admin at `/admin`. Brokerage data via SnapTrade personal API keys.

## Requirements

- Node.js 20+
- Cloudflare account
- [SnapTrade](https://snaptrade.com/personal) personal API keys

## Development

```bash
npm i
npx wrangler login
npm run setup
npm run build:web
npm run dev
```

`http://localhost:8787`. `TOKEN_ENC_KEY` is read from `.dev.vars` (`npm run setup` creates it from `.dev.vars.example`).

## Deployment

```bash
npm run deploy
npx wrangler secret put TOKEN_ENC_KEY
```

D1 and KV are provisioned on first deploy. Do not commit resource IDs or secrets. Cron: `0 8 * * *` UTC.

## Documentation

- [API](docs/API.md)
- [Schema](docs/SCHEMA.md)
- [Design](docs/DESIGN.md)

## License

[MIT](LICENSE)
