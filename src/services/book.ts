import { asNum, currentReturn, formatClock, formatMoney, formatPct, formatSigned, weightOf } from "../lib/format";
import type { SqlDatabase } from "../storage/database";
import { Users, type Profile, type UserRow } from "./users";

export type ConnStatus = "disconnected" | "connected" | "reauth";

type SnapshotRow = {
  id: string;
  user_id: string;
  account_id: string;
  synced_at: number;
  ytd: string | null;
  paper: number;
};

type CashRow = { ccy: string; balance: string };
type PositionRow = {
  code: string;
  ccy: string;
  name: string;
  price: string;
  qty: string;
  value: string;
  cost: string;
};
type OrderRow = {
  code: string;
  ccy: string;
  side: "buy" | "sell";
  status: "open" | "partial" | "filled" | "cancelled" | "rejected";
  price: string;
  qty: string;
  amount: string;
  traded_at: number;
};

export type CashView = { ccy: string; balance: string; weight: string };
export type HoldingView = PositionRow & { weight: string; pnl: string; pnlPct: string };
export type OrderView = {
  code: string;
  side: "buy" | "sell";
  ccy: string;
  price: string;
  qty: string;
  amount: string;
  status: OrderRow["status"];
  time: string;
};

function withWeights(cash: CashRow[], holdings: PositionRow[]) {
  const totals = new Map<string, number>();
  for (const row of cash) totals.set(row.ccy, (totals.get(row.ccy) ?? 0) + asNum(row.balance));
  for (const row of holdings) totals.set(row.ccy, (totals.get(row.ccy) ?? 0) + asNum(row.value));
  const cashView: CashView[] = cash
    .filter((row) => asNum(row.balance) > 0)
    .map((row) => ({
      ...row,
      balance: formatMoney(row.balance),
      weight: weightOf(row.balance, totals.get(row.ccy) ?? 0),
    }));
  const holdingView: HoldingView[] = holdings.map((row) => ({
    ...row,
    price: formatMoney(row.price),
    qty: formatMoney(row.qty),
    value: formatMoney(row.value),
    cost: formatMoney(row.cost),
    pnl: formatSigned(asNum(row.value) - asNum(row.cost)),
    pnlPct: formatPct(asNum(row.value) - asNum(row.cost), asNum(row.cost)) ?? "—",
    weight: weightOf(row.value, totals.get(row.ccy) ?? 0),
  }));
  return { cash: cashView, holdings: holdingView };
}

function hideSize(holdings: HoldingView[], orders: OrderView[]) {
  return {
    holdings: holdings.map(({ qty: _qty, value: _value, cost: _cost, pnl: _pnl, weight: _weight, ...rest }) => rest),
    orders: orders.map(({ qty: _qty, amount: _amount, ...rest }) => rest),
  };
}

class Book {
  private readonly users: Users;

  constructor(private readonly db: SqlDatabase) {
    this.users = new Users(db);
  }

  async public() {
    const user = await this.users.get();
    if (!user) {
      return {
        listed: false,
        profile: { name: "", bio: "", avatar: null, x: null, site: null, youtube: null } satisfies Profile,
      };
    }
    const profile = this.users.profile(user);
    const share = this.users.share(user);
    if (!share.listed) return { listed: false, profile };
    const loaded = await this.load(user.id);
    if (!loaded) return { listed: true, profile, snapshot: null };
    const sized = share.showQty
      ? { holdings: loaded.holdings, orders: loaded.orders }
      : hideSize(loaded.holdings, loaded.orders);
    return {
      listed: true,
      showQty: share.showQty,
      showFills: share.showFills,
      profile: { ...profile, paper: loaded.paper },
      snapshot: {
        lastOk: loaded.lastOk,
        ytd: loaded.ytd,
        cash: loaded.cash,
        holdings: sized.holdings,
        ...(share.showFills ? { orders: sized.orders } : {}),
      },
    };
  }

  async overview(userId: string) {
    const user = await this.users.getById(userId);
    if (!user) return null;
    const status = await this.status(userId);
    const loaded = await this.load(userId);
    return {
      status,
      source: "SnapTrade",
      listed: user.listed === 1,
      ytd: loaded?.ytd ?? null,
      lastOk: loaded?.lastOk ?? null,
      activity: loaded?.orders.slice(0, 8).map((row) => ({ side: row.side, code: row.code, time: row.time })) ?? [],
    };
  }

  async holdings(userId: string) {
    const loaded = await this.load(userId);
    return { cash: loaded?.cash ?? [], holdings: loaded?.holdings ?? [] };
  }

  async orders(userId: string) {
    const loaded = await this.load(userId);
    return { orders: loaded?.orders ?? [] };
  }

  async syncs(userId: string) {
    const { results } = await this.db
      .prepare("SELECT ok, detail, finished_at FROM syncs WHERE user_id = ? ORDER BY finished_at DESC LIMIT 50")
      .bind(userId)
      .all<{ ok: number; detail: string; finished_at: number }>();
    return {
      syncs: results.map((row) => ({
        time: formatClock(row.finished_at),
        ok: row.ok === 1,
        detail: row.detail,
      })),
    };
  }

  async share(user: UserRow) {
    return this.users.share(user);
  }

  async status(userId: string): Promise<ConnStatus> {
    const row = await this.db
      .prepare("SELECT status FROM connections WHERE user_id = ? LIMIT 1")
      .bind(userId)
      .first<{ status: "connected" | "reauth" }>();
    return row?.status ?? "disconnected";
  }

  async lastOk(userId: string) {
    const row = await this.db
      .prepare("SELECT synced_at FROM snapshots WHERE user_id = ? LIMIT 1")
      .bind(userId)
      .first<{ synced_at: number }>();
    return row ? formatClock(row.synced_at) : null;
  }

  private async load(userId: string) {
    const snapshot = await this.db
      .prepare("SELECT * FROM snapshots WHERE user_id = ? LIMIT 1")
      .bind(userId)
      .first<SnapshotRow>();
    if (!snapshot) return null;
    const cash = await this.db
      .prepare("SELECT ccy, balance FROM cash WHERE snapshot_id = ? ORDER BY ccy")
      .bind(snapshot.id)
      .all<CashRow>();
    const positions = await this.db
      .prepare("SELECT code, ccy, name, price, qty, value, cost FROM positions WHERE snapshot_id = ? ORDER BY ccy, code")
      .bind(snapshot.id)
      .all<PositionRow>();
    const orders = await this.db
      .prepare(
        "SELECT code, ccy, side, status, price, qty, amount, traded_at FROM orders WHERE snapshot_id = ? ORDER BY traded_at DESC",
      )
      .bind(snapshot.id)
      .all<OrderRow>();
    const weighted = withWeights(cash.results, positions.results);
    return {
      lastOk: formatClock(snapshot.synced_at),
      ytd: currentReturn(positions.results),
      paper: snapshot.paper === 1,
      cash: weighted.cash,
      holdings: weighted.holdings,
      orders: orders.results.map(
        (row) =>
          ({
            code: row.code,
            side: row.side,
            ccy: row.ccy,
            price: formatMoney(row.price),
            qty: formatMoney(row.qty),
            amount: formatMoney(row.amount),
            status: row.status,
            time: formatClock(row.traded_at),
          }) satisfies OrderView,
      ),
    };
  }
}

export { Book };
