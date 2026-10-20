import type { Copy, Market } from "../lib/copy";
import { marketFromCurrency, parseCopy, parseMarkets } from "../lib/copy";
import { formatAmount, formatClock } from "../lib/format";
import type { SqlDatabase } from "../storage/database";

export type HoldingSide = "long" | "short" | "flat";
export type OrderSide = "buy" | "sell";
export type OrderStatus = "open" | "partial" | "filled" | "cancelled" | "rejected";

export type HoldingRow = {
  accountId: string;
  account: string;
  market: Market | "cash";
  code: string;
  name: Copy;
  currency: string;
  side: HoldingSide;
  qty: string;
  cost: string;
  value: string;
  pl: string;
};

export type OrderRow = {
  time: string;
  tradedAt: number;
  code: string;
  name: Copy;
  currency: string;
  side: OrderSide;
  status: OrderStatus;
  qty: string;
  price: string;
  amount: string;
};

type PositionRecord = {
  account_id: string;
  card_mask: string;
  markets: string;
  code: string;
  currency: string;
  name: string;
  side: HoldingSide;
  qty: string;
  cost: string;
  value: string;
  pl: string;
};

type OrderRecord = {
  traded_at: number;
  code: string;
  name: string;
  currency: string;
  side: OrderSide;
  status: OrderStatus;
  qty: string;
  price: string;
};

class Ledger {
  constructor(private readonly db: SqlDatabase) {}

  async holdings(userId: string, includedOnly = true) {
    const filter = includedOnly ? "AND a.included = 1" : "";
    const { results } = await this.db
      .prepare(
        `SELECT a.id AS account_id, a.card_mask, a.markets, pos.code, pos.currency, pos.name,
                pos.side, pos.qty, pos.cost, pos.value, pos.pl
         FROM positions pos
         JOIN accounts a ON a.id = pos.account_id
         WHERE a.user_id = ? ${filter}
         ORDER BY pos.as_of DESC, pos.code`,
      )
      .bind(userId)
      .all<PositionRecord>();

    return results.map((row) => {
      const markets = parseMarkets(row.markets);
      const fromCcy = marketFromCurrency(row.currency);
      return {
        accountId: row.account_id,
        account: row.card_mask || row.account_id,
        market: row.side === "flat" ? "cash" : fromCcy === "cash" ? (markets[0] ?? "us") : fromCcy,
        code: row.code,
        name: parseCopy(row.name),
        currency: row.currency,
        side: row.side,
        qty: row.qty,
        cost: row.cost,
        value: row.value,
        pl: row.pl,
      } satisfies HoldingRow;
    });
  }

  async orders(userId: string, includedOnly = true) {
    const filter = includedOnly ? "AND a.included = 1" : "";
    const { results } = await this.db
      .prepare(
        `SELECT o.traded_at, o.code, o.name, o.currency, o.side, o.status, o.qty, o.price
         FROM orders o
         JOIN accounts a ON a.id = o.account_id
         WHERE a.user_id = ? AND o.status = 'filled' ${filter}
         ORDER BY o.traded_at DESC
         LIMIT 50`,
      )
      .bind(userId)
      .all<OrderRecord>();

    return results.map((row) => ({
      time: formatClock(row.traded_at),
      tradedAt: row.traded_at,
      code: row.code,
      name: parseCopy(row.name),
      currency: row.currency,
      side: row.side,
      status: row.status,
      qty: row.qty,
      price: row.price,
      amount: formatAmount(row.qty, row.price),
    } satisfies OrderRow));
  }

  async replacePositions(
    accountId: string,
    rows: Array<{
      code: string;
      name: string;
      currency: string;
      side: HoldingSide;
      qty: string;
      cost: string;
      value: string;
      pl: string;
    }>,
    asOf: number,
  ) {
    await this.db.prepare("DELETE FROM positions WHERE account_id = ?").bind(accountId).run();
    const inserts = rows.map((row) =>
      this.db
        .prepare(
          `INSERT INTO positions (account_id, code, currency, name, side, qty, cost, value, pl, as_of)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(accountId, row.code, row.currency, row.name, row.side, row.qty, row.cost, row.value, row.pl, asOf),
    );
    const snapshots = rows.map((row) =>
      this.db
        .prepare(
          `INSERT OR REPLACE INTO position_snapshots
             (account_id, synced_at, code, currency, name, side, qty, cost, value, pl)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(accountId, asOf, row.code, row.currency, row.name, row.side, row.qty, row.cost, row.value, row.pl),
    );
    const statements = [...inserts, ...snapshots];
    for (let i = 0; i < statements.length; i += 40) {
      await this.db.batch(statements.slice(i, i + 40));
    }
  }

  async upsertFills(
    accountId: string,
    fills: Array<{
      dealId: string;
      side: OrderSide;
      code: string;
      name: string;
      currency: string;
      qty: string;
      price: string;
      tradedAt: number;
    }>,
  ) {
    if (!fills.length) return;
    const statements = fills.map((fill) =>
      this.db
        .prepare(
          `INSERT OR IGNORE INTO orders
             (id, account_id, broker, external_id, status, side, code, name, currency, qty, filled_qty, price, traded_at)
           VALUES (?, ?, 'futu', ?, 'filled', ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          accountId,
          fill.dealId,
          fill.side,
          fill.code,
          fill.name,
          fill.currency,
          fill.qty,
          fill.qty,
          fill.price,
          fill.tradedAt,
        ),
    );
    for (let i = 0; i < statements.length; i += 40) {
      await this.db.batch(statements.slice(i, i + 40));
    }
  }
}

export { Ledger };
