# Wire

**English** | [简体中文](docs/README.zh-CN.md)

Self-hosted holdings page on Cloudflare Workers (D1, KV). One instance, one book. Public site at `/`; admin at `/admin`. Brokerage data via SnapTrade personal API keys.

## Features

- Public holdings page and an admin console (connect, holdings, orders, sync log, sharing, profile)
- One admin, created on first visit; one included brokerage account
- Daily snapshot at `0 8 * * *` UTC; the public page keeps the last successful sync
- Share switches: list the book, show size, show recent orders (size is omitted from the API when off)
- Per-currency weights including cash; current return and per-position P&L; no FX conversion
- Chinese / English, light / dark / system

## Brokerages

Connections go through [SnapTrade Personal](https://snaptrade.com/personal). Wire does not talk to brokers directly. You authorize in SnapTrade’s portal, then include one account.

SnapTrade covers 40+ firms, including Schwab, Fidelity, Robinhood, Interactive Brokers, E*TRADE, Vanguard, Webull, moomoo, Wealthsimple, Questrade, Coinbase, and Kraken. See the [full list](https://snaptrade.com/brokerage-integrations).

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
