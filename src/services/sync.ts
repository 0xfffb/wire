import { SnaptradeError } from "../brokerage/snaptrade";
import type { Deps } from "../deps";
import { purgePublic } from "../middleware";
import { Connect } from "./connect";
import { Keys } from "./keys";

type IncludedAccount = {
  id: string;
  external_id: string;
  paper: number;
};

class HoldingsSync {
  constructor(private readonly deps: Deps) {}

  static from(deps: Deps) {
    return new HoldingsSync(deps);
  }

  async runAll() {
    const user = await this.deps.database.prepare("SELECT id FROM users LIMIT 1").first<{ id: string }>();
    if (!user) return;
    const included = await this.included(user.id);
    if (!included) return;
    await this.runUser(user.id);
  }

  async runUser(userId: string) {
    const included = await this.included(userId);
    if (!included) return;
    const connect = Connect.from(this.deps);
    const snaptrade = await Keys.from(this.deps).client();
    if (!snaptrade) {
      await this.log(userId, false, "snaptrade_unconfigured");
      return;
    }
    try {
      const [cash, positions, orders] = await Promise.all([
        snaptrade.listCash(included.external_id),
        snaptrade.listPositions(included.external_id),
        snaptrade.listOrders(included.external_id).catch(() => []),
      ]);
      const snapshotId = crypto.randomUUID();
      const now = Date.now();
      await connect.clearBook(userId);
      await this.deps.database
        .prepare("INSERT INTO snapshots (id, user_id, account_id, synced_at, ytd, paper) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(snapshotId, userId, included.id, now, null, included.paper)
        .run();
      const statements = [
        ...cash.map((row) =>
          this.deps.database
            .prepare("INSERT INTO cash (snapshot_id, ccy, balance) VALUES (?, ?, ?)")
            .bind(snapshotId, row.ccy, row.balance),
        ),
        ...positions.map((row) =>
          this.deps.database
            .prepare("INSERT INTO positions (snapshot_id, code, ccy, name, price, qty, value, cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(snapshotId, row.code, row.ccy, row.name, row.price, row.qty, row.value, row.cost),
        ),
        ...orders.map((row) =>
          this.deps.database
            .prepare(
              "INSERT INTO orders (id, snapshot_id, external_id, code, ccy, side, status, price, qty, amount, traded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(
              crypto.randomUUID(),
              snapshotId,
              row.externalId,
              row.code,
              row.ccy,
              row.side,
              row.status,
              row.price,
              row.qty,
              row.amount,
              row.tradedAt,
            ),
        ),
      ];
      if (statements.length) await this.deps.database.batch(statements);
      await connect.mark(userId, "connected");
      await this.log(userId, true, "ok");
      await purgePublic();
    } catch (error) {
      const code = error instanceof SnaptradeError ? error.code : "snaptrade_unavailable";
      const message = error instanceof SnaptradeError ? error.detail?.trim() : "";
      if (code === "reauth_needed") await connect.mark(userId, "reauth");
      await this.log(userId, false, message && message !== code ? message.slice(0, 200) : code);
    }
  }

  private async included(userId: string) {
    return this.deps.database
      .prepare("SELECT id, external_id, paper FROM accounts WHERE user_id = ? AND included = 1 LIMIT 1")
      .bind(userId)
      .first<IncludedAccount>();
  }

  private async log(userId: string, ok: boolean, detail: string) {
    await this.deps.database
      .prepare("INSERT INTO syncs (id, user_id, ok, detail, finished_at) VALUES (?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), userId, ok ? 1 : 0, detail, Date.now())
      .run();
  }
}

export { HoldingsSync };
