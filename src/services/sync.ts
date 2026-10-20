import type { Deps } from "../deps";
import { formatMoney, formatPl, toUnixMs } from "../lib/format";
import { parseMarkets, type Market } from "../lib/copy";
import type { BrokerPosition } from "../brokerage";
import { Brokers } from "./brokers";
import { Ledger, type HoldingSide, type OrderSide } from "./ledger";

const MARKET: Record<Market, string> = { us: "US", hk: "HK" };
const MAX_FILL_PAGES = 6;

class HoldingsSync {
  constructor(private readonly deps: Deps) {}

  static from(deps: Deps) {
    return new HoldingsSync(deps);
  }

  async runUser(userId: string) {
    const token = await Brokers.from(this.deps).accessToken(userId);
    if (!token) throw new Error("no_token");
    const { results } = await this.deps.database
      .prepare("SELECT id FROM accounts WHERE user_id = ? AND included = 1")
      .bind(userId)
      .all<{ id: string }>();
    let failed = 0;
    for (const row of results) {
      try {
        await this.runAccount(userId, row.id);
      } catch {
        failed += 1;
      }
    }
    if (failed && failed === results.length) throw new Error("sync_failed");
  }

  async runAccount(userId: string, accountId: string) {
    const token = await Brokers.from(this.deps).accessToken(userId);
    if (!token) return;
    const account = await this.deps.database
      .prepare("SELECT id, external_id, markets FROM accounts WHERE id = ? AND user_id = ? LIMIT 1")
      .bind(accountId, userId)
      .first<{ id: string; external_id: string; markets: string }>();
    if (!account) return;

    const futu = this.deps.brokerage.futu;
    const ledger = new Ledger(this.deps.database);
    const positions = await futu.listPositions(token, account.external_id);
    const holdings = positions.flatMap((row) => {
      const holding = toHolding(row);
      return holding ? [holding] : [];
    });
    try {
      const funds = await futu.listFunds(token, account.external_id);
      holdings.push(...funds.flatMap((row) => {
        const cash = toCash(row.currency, row.cash);
        return cash ? [cash] : [];
      }));
    } catch {
      /* stocks still saved */
    }
    const asOf = Date.now();
    await ledger.replacePositions(account.id, holdings, asOf);

    const markets = parseMarkets(account.markets);
    const wanted = markets.length ? markets : (["us", "hk"] as Market[]);
    try {
      for (const market of wanted) {
        let pageFlag: string | undefined;
        for (let page = 0; page < MAX_FILL_PAGES; page += 1) {
          const batch = await futu.listFills({
            accessToken: token,
            accountId: account.external_id,
            market: MARKET[market],
            startAt: 0,
            endAt: 0,
            pageFlag: pageFlag ?? "",
          });
          await ledger.upsertFills(
            account.id,
            batch.fills.flatMap((fill) => {
              const qty = Number(fill.qty.replace(/,/g, ""));
              if (!fill.dealId || !fill.code || (Number.isFinite(qty) && qty === 0)) return [];
              return [
                {
                  dealId: fill.dealId,
                  side: fillSide(fill.side),
                  code: fill.code,
                  name: JSON.stringify({ zh: fill.stockName, en: fill.stockName }),
                  currency: currencyFromCode(fill.code),
                  qty: fill.qty,
                  price: fill.price,
                  tradedAt: toUnixMs(fill.tradedAt),
                },
              ];
            }),
          );
          if (!batch.nextPageFlag) break;
          pageFlag = batch.nextPageFlag;
        }
      }
    } catch {
      /* positions already saved */
    }
  }
}

function toHolding(row: BrokerPosition) {
  const qty = Number(row.qty.replace(/,/g, ""));
  if (!row.code || (Number.isFinite(qty) && qty === 0)) return null;
  return {
    code: row.code,
    name: JSON.stringify({ zh: row.stockName, en: row.stockName }),
    currency: row.currency || currencyFromCode(row.code),
    side: holdingSide(row.side),
    qty: row.qty,
    cost: formatMoney(row.costPrice),
    value: formatMoney(row.marketVal),
    pl: formatPl(row.plRatio, row.plRatioValid),
  };
}

function toCash(currency: string, cash: string) {
  const n = Number(cash.replace(/,/g, ""));
  if (!currency || !Number.isFinite(n) || n === 0) return null;
  return {
    code: "CASH",
    name: JSON.stringify({ zh: `现金 ${currency}`, en: `Cash ${currency}` }),
    currency,
    side: "flat" as const,
    qty: "—",
    cost: "—",
    value: formatMoney(cash),
    pl: "—",
  };
}

function holdingSide(side: string): HoldingSide {
  return side.toUpperCase() === "SHORT" ? "short" : "long";
}

function fillSide(side: string): OrderSide {
  return side.toUpperCase() === "SELL" ? "sell" : "buy";
}

function currencyFromCode(code: string) {
  if (code.startsWith("HK.")) return "HKD";
  if (code.startsWith("US.")) return "USD";
  return "USD";
}

export { HoldingsSync };
