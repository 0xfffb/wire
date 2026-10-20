import type { AccountMarket, Copy } from "../lib/copy";
import { parseAccountMarkets } from "../lib/copy";
import { formatClock, startOfShanghaiDay } from "../lib/format";
import type { SqlDatabase } from "../storage/database";
import { Ledger, type HoldingRow, type OrderRow } from "./ledger";
import { Publishers, type PublisherRecord } from "./publishers";

export type ConsoleAccount = {
  id: string;
  mask: string;
  markets: AccountMarket[];
  included: boolean;
};

export type ConsoleEvent = {
  kind: "fill";
  side: OrderRow["side"];
  text: Copy;
  time: Copy;
};

const BROKERS = [
  { id: "futu", name: { zh: "富途", en: "Futu" }, ready: true },
] as const;

type AccountRecord = {
  id: string;
  card_mask: string;
  markets: string;
  included: number;
};

class PublisherConsole {
  private readonly ledger: Ledger;
  private readonly publishers: Publishers;

  constructor(private readonly db: SqlDatabase) {
    this.ledger = new Ledger(db);
    this.publishers = new Publishers(db);
  }

  async overview(userId: string, record: PublisherRecord) {
    const broker = await this.connectedBroker(userId);
    const accounts = await this.accounts(userId);
    const holdings = await this.ledger.holdings(userId, true);
    const orders = await this.ledger.orders(userId, true);
    const today = startOfShanghaiDay();
    return {
      connected: Boolean(broker),
      broker,
      accountsIncluded: accounts.filter((item) => item.included).length,
      ytd: record.ytd,
      symbols: holdings.filter((item) => item.side !== "flat").length,
      todayEvents: orders.filter((item) => item.tradedAt >= today).length,
      events: orders.slice(0, 8).map(toEvent),
    };
  }

  async holdings(userId: string) {
    const accounts = await this.accounts(userId);
    const holdings = await this.ledger.holdings(userId, true);
    return {
      accounts: accounts.filter((item) => item.included),
      holdings: holdings.map(toConsoleHolding),
    };
  }

  async orders(userId: string) {
    return { orders: await this.ledger.orders(userId, true) };
  }

  async broker(userId: string) {
    const broker = await this.connectedBroker(userId);
    return {
      connected: Boolean(broker),
      broker,
      brokers: BROKERS,
      accounts: await this.accounts(userId),
    };
  }

  async share(record: PublisherRecord) {
    return {
      listed: record.listed,
      price: record.price,
      markets: record.markets,
    };
  }

  async setShare(userId: string, input: { listed?: boolean; price?: number }) {
    await this.publishers.setShare(userId, input);
    const record = await this.publishers.getRecord(userId);
    if (!record) throw new Error("publisher_missing");
    return this.share(record);
  }

  private async connectedBroker(userId: string) {
    const row = await this.db
      .prepare("SELECT broker FROM broker_links WHERE user_id = ? LIMIT 1")
      .bind(userId)
      .first<{ broker: string }>();
    return row?.broker ?? null;
  }

  private async accounts(userId: string) {
    const { results } = await this.db
      .prepare(
        "SELECT id, card_mask, markets, included FROM accounts WHERE user_id = ? ORDER BY created_at, id",
      )
      .bind(userId)
      .all<AccountRecord>();
    return results.map(
      (row) =>
        ({
          id: row.id,
          mask: row.card_mask || row.id,
          markets: parseAccountMarkets(row.markets),
          included: row.included === 1,
        }) satisfies ConsoleAccount,
    );
  }
}

function toConsoleHolding(row: HoldingRow) {
  return {
    code: row.code,
    name: row.name,
    side: row.side,
    qty: row.qty,
    cost: row.cost,
    value: row.value,
    pl: row.pl,
    account: row.account,
    market: row.market,
  };
}

function toEvent(row: OrderRow): ConsoleEvent {
  const clock = formatClock(row.tradedAt);
  return {
    kind: "fill",
    side: row.side,
    text: {
      zh: `${row.side === "buy" ? "买入" : "卖出"} ${row.code} · ${row.qty}`,
      en: `${row.side === "buy" ? "Bought" : "Sold"} ${row.code} · ${row.qty}`,
    },
    time: { zh: clock, en: clock },
  };
}

export { PublisherConsole };
