import { eq } from "drizzle-orm";
import { brokerConnections } from "@/broker/connections";
import { oauthClientStore } from "@/broker/oauth-clients";
import { brokerRegistry } from "@/broker/registry";
import { Database } from "@/db/database";
import { activities, brokerConnections as connectionTable, fills, positionSnapshots, positions } from "@/db/schema";
import { tokenVault } from "@/token/vault";

type PositionRow = {
  code: string;
  stockName: string;
  side: string;
  qty: string;
  price: string;
};

export class SyncService {
  private readonly running = new Set<string>();
  private started = false;

  start(intervalMs = 15 * 60 * 1000) {
    if (this.started) return;
    this.started = true;
    void this.renewAll();
    setInterval(() => {
      void this.renewAll();
    }, 10 * 60 * 1000);
    setInterval(() => {
      void this.syncAll();
    }, intervalMs);
  }

  async renewAll() {
    const connections = Database.current().select().from(connectionTable).all();
    for (const connection of connections) {
      if (connection.status === "needs_reauth" || !connection.refreshTokenEnc) continue;
      const expiresSoon = !connection.accessExpiresAt || connection.accessExpiresAt - Date.now() < 20 * 60 * 1000;
      if (!expiresSoon) continue;
      try {
        await this.accessToken(connection.id);
      } catch (error) {
        console.error("renew failed", connection.id, error);
      }
    }
  }

  async syncAll() {
    const connections = Database.current().select().from(connectionTable).all();
    for (const connection of connections) {
      if (connection.status === "needs_reauth" || !connection.refreshTokenEnc) continue;
      if (brokerConnections.included(connection.id).length === 0) continue;
      try {
        await this.sync(connection.id);
      } catch (error) {
        console.error("sync failed", connection.id, error);
      }
    }
  }

  async sync(connectionId: string) {
    if (this.running.has(connectionId)) return;
    this.running.add(connectionId);
    const db = Database.current();
    try {
      db.update(connectionTable).set({ status: "syncing", lastError: null }).where(eq(connectionTable.id, connectionId)).run();
      const connection = db.select().from(connectionTable).where(eq(connectionTable.id, connectionId)).get();
      if (!connection) throw new Error("找不到券商连接");
      const broker = brokerRegistry.get(connection.broker);
      const token = await this.accessToken(connectionId);
      brokerConnections.upsertAccounts(connectionId, await broker.listAccounts(token));
      const included = brokerConnections.included(connectionId);

      for (const account of included) {
        try {
          brokerConnections.saveFunds(account.id, await broker.listFunds(token, account.accId));
        } catch (error) {
          console.error("funds failed", account.accId, error);
        }
        const previous = this.latestPositions(account.id);
        const remote = await broker.listPositions(token, account.accId);
        const snapshotId = crypto.randomUUID();
        const syncedAt = Date.now();
        db.insert(positionSnapshots).values({ id: snapshotId, accountId: account.id, syncedAt }).run();
        const seen = new Set<string>();
        for (const position of remote) {
          if (!position.code) continue;
          db.insert(positions)
            .values({
              id: crypto.randomUUID(),
              snapshotId,
              code: position.code,
              stockName: position.stockName,
              side: position.side,
              qty: position.qty,
              costPrice: position.costPrice,
              marketVal: position.marketVal,
              plRatio: position.plRatio,
              plRatioValid: position.plRatioValid ? 1 : 0,
              currency: position.currency,
            })
            .run();
          const key = this.positionKey(position.code, position.side);
          seen.add(key);
          const before = previous.get(key);
          const change = before ? this.qtyChange(before.qty, position.qty) : "opened";
          if (change === "same") continue;
          db.insert(activities)
            .values({
              id: crypto.randomUUID(),
              accountId: account.id,
              kind: change,
              code: position.code,
              stockName: position.stockName,
              side: position.side,
              qty: position.qty,
              price: position.costPrice,
              createdAt: syncedAt,
            })
            .run();
        }
        for (const [key, before] of previous) {
          if (seen.has(key)) continue;
          db.insert(activities)
            .values({
              id: crypto.randomUUID(),
              accountId: account.id,
              kind: "closed",
              code: before.code,
              stockName: before.stockName,
              side: before.side,
              qty: "0",
              price: before.price,
              createdAt: syncedAt,
            })
            .run();
        }
        await this.pullFills(broker, token, account.id, account.accId, JSON.parse(account.markets) as string[]);
      }

      db.update(connectionTable)
        .set({ status: "authorized", lastSyncAt: Date.now(), lastError: null })
        .where(eq(connectionTable.id, connectionId))
        .run();
    } catch (error) {
      const current = db.select().from(connectionTable).where(eq(connectionTable.id, connectionId)).get();
      if (current?.status !== "needs_reauth") {
        db.update(connectionTable)
          .set({ status: "error", lastError: error instanceof Error ? error.message : "同步失败" })
          .where(eq(connectionTable.id, connectionId))
          .run();
      }
      throw error;
    } finally {
      this.running.delete(connectionId);
    }
  }

  private async accessToken(connectionId: string) {
    const db = Database.current();
    const connection = db.select().from(connectionTable).where(eq(connectionTable.id, connectionId)).get();
    if (!connection?.refreshTokenEnc) throw new Error("连接缺少 refresh token");
    const fresh = connection.accessTokenEnc && connection.accessExpiresAt && connection.accessExpiresAt - Date.now() > 20 * 60 * 1000;
    if (fresh && connection.accessTokenEnc) return tokenVault.decrypt(connection.accessTokenEnc);
    const broker = brokerRegistry.get(connection.broker);
    const client = oauthClientStore.get(connection.broker);
    if (!client) throw new Error("缺少富途应用编号");
    try {
      const next = await broker.refresh(tokenVault.decrypt(connection.refreshTokenEnc), client.clientId);
      db.update(connectionTable)
        .set({
          accessTokenEnc: tokenVault.encrypt(next.accessToken),
          refreshTokenEnc: tokenVault.encrypt(next.refreshToken),
          accessExpiresAt: Date.now() + next.expiresIn * 1000,
          scope: next.scope,
          status: "authorized",
          lastError: null,
        })
        .where(eq(connectionTable.id, connectionId))
        .run();
      return next.accessToken;
    } catch (error) {
      db.update(connectionTable)
        .set({ status: "needs_reauth", lastError: error instanceof Error ? error.message : "刷新授权失败" })
        .where(eq(connectionTable.id, connectionId))
        .run();
      throw error;
    }
  }

  private latestPositions(accountId: string) {
    const db = Database.current();
    const snapshot = db
      .select()
      .from(positionSnapshots)
      .where(eq(positionSnapshots.accountId, accountId))
      .all()
      .sort((a, b) => b.syncedAt - a.syncedAt)[0];
    if (!snapshot) return new Map<string, PositionRow>();
    const rows = db.select().from(positions).where(eq(positions.snapshotId, snapshot.id)).all();
    return new Map(
      rows.map((row) => [
        this.positionKey(row.code, row.side),
        { code: row.code, stockName: row.stockName, side: row.side, qty: row.qty, price: row.costPrice },
      ]),
    );
  }

  private async pullFills(broker: ReturnType<typeof brokerRegistry.get>, token: string, accountId: string, accId: string, markets: string[]) {
    const db = Database.current();
    for (const market of markets) {
      let pageFlag = "";
      let guard = 0;
      while (guard < 20) {
        guard += 1;
        const page = await broker.listFills(token, accId, market, pageFlag);
        let novel = 0;
        for (const fill of page.fills) {
          if (!fill.dealId) continue;
          const inserted = db
            .insert(fills)
            .values({
              id: crypto.randomUUID(),
              accountId,
              dealId: fill.dealId,
              side: fill.side,
              code: fill.code,
              stockName: fill.stockName,
              qty: fill.qty,
              price: fill.price,
              tradedAt: fill.tradedAt,
            })
            .onConflictDoNothing()
            .run();
          if (!inserted.changes) continue;
          novel += 1;
          db.insert(activities)
            .values({
              id: crypto.randomUUID(),
              accountId,
              kind: "fill",
              code: fill.code,
              stockName: fill.stockName,
              side: fill.side,
              qty: fill.qty,
              price: fill.price,
              createdAt: fill.tradedAt,
            })
            .run();
        }
        if (novel === 0 || page.completed || !page.pageFlag) break;
        pageFlag = page.pageFlag;
      }
    }
  }

  private positionKey(code: string, side: string) {
    return `${code}:${side}`;
  }

  private qtyChange(previous: string, next: string) {
    const left = Number(previous);
    const right = Number(next);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return previous === next ? "same" : "increased";
    if (right > left) return "increased";
    if (right < left) return "decreased";
    return "same";
  }
}

export const syncService = new SyncService();
