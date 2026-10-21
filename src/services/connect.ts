import { SnaptradeError, type SnaptradeAccount, type SnaptradeCreds } from "../brokerage/snaptrade";
import type { Deps } from "../deps";
import { encryptSecret } from "../lib/secret";
import { Book, type ConnStatus } from "./book";
import { Keys } from "./keys";
import { HoldingsSync } from "./sync";

const PORTAL_KEY = (userId: string) => `portal:${userId}`;
const PORTAL_TTL = 60 * 60;

type AccountRow = {
  id: string;
  external_id: string;
  mask: string;
  brokerage: string;
  paper: number;
  included: number;
};

class Connect {
  constructor(private readonly deps: Deps) {}

  static from(deps: Deps) {
    return new Connect(deps);
  }

  async view(userId: string) {
    const book = new Book(this.deps.database);
    const status = await book.status(userId);
    const lastOk = await book.lastOk(userId);
    const keys = await Keys.from(this.deps).publicView();
    const { results } = await this.deps.database
      .prepare("SELECT id, external_id, mask, brokerage, paper, included FROM accounts WHERE user_id = ? ORDER BY created_at, id")
      .bind(userId)
      .all<AccountRow>();
    return {
      status,
      configured: keys.configured,
      clientId: keys.clientId,
      lastOk,
      accounts: results.map((row) => ({
        id: row.id,
        mask: row.mask,
        brokerage: row.brokerage,
        paper: row.paper === 1,
        included: row.included === 1,
      })),
    };
  }

  async start(userId: string, origin: string) {
    const snaptrade = await this.snaptrade();
    await this.deps.kv.put(PORTAL_KEY(userId), "1", { ttlSec: PORTAL_TTL });
    const url = await snaptrade.login({
      redirect: `${origin}/oauth/snaptrade/callback`,
    });
    return { url };
  }

  async finish(userId: string) {
    const snaptrade = await this.snaptrade();
    const accounts = await snaptrade.listAccounts();
    await this.saveConnection(userId, { userId: "personal", userSecret: "" }, "connected");
    await this.replaceAccounts(userId, accounts);
    return this.view(userId);
  }

  async setAccount(userId: string, accountId: string) {
    const status = await new Book(this.deps.database).status(userId);
    if (status === "disconnected") return { error: "disconnected" as const };
    const account = await this.deps.database
      .prepare("SELECT id FROM accounts WHERE id = ? AND user_id = ? LIMIT 1")
      .bind(accountId, userId)
      .first<{ id: string }>();
    if (!account) return { error: "invalid_body" as const };
    await this.deps.database.prepare("UPDATE accounts SET included = 0 WHERE user_id = ?").bind(userId).run();
    await this.deps.database.prepare("UPDATE accounts SET included = 1 WHERE id = ? AND user_id = ?").bind(accountId, userId).run();
    await HoldingsSync.from(this.deps).runUser(userId);
    return this.view(userId);
  }

  async disconnect(userId: string) {
    await this.clearBook(userId);
    await this.deps.database.prepare("DELETE FROM accounts WHERE user_id = ?").bind(userId).run();
    await this.deps.database.prepare("DELETE FROM connections WHERE user_id = ?").bind(userId).run();
    await this.deps.kv.delete(PORTAL_KEY(userId));
    return this.view(userId);
  }

  async mark(userId: string, status: Exclude<ConnStatus, "disconnected">) {
    await this.deps.database
      .prepare("UPDATE connections SET status = ?, updated_at = ? WHERE user_id = ?")
      .bind(status, Date.now(), userId)
      .run();
  }

  async clearBook(userId: string) {
    const snapshot = await this.deps.database
      .prepare("SELECT id FROM snapshots WHERE user_id = ? LIMIT 1")
      .bind(userId)
      .first<{ id: string }>();
    if (!snapshot) return;
    await this.deps.database.batch([
      this.deps.database.prepare("DELETE FROM cash WHERE snapshot_id = ?").bind(snapshot.id),
      this.deps.database.prepare("DELETE FROM positions WHERE snapshot_id = ?").bind(snapshot.id),
      this.deps.database.prepare("DELETE FROM orders WHERE snapshot_id = ?").bind(snapshot.id),
      this.deps.database.prepare("DELETE FROM snapshots WHERE id = ?").bind(snapshot.id),
    ]);
  }

  private async saveConnection(userId: string, creds: SnaptradeCreds, status: "connected" | "reauth") {
    const enc = await encryptSecret(creds.userSecret, this.deps.tokenKey);
    const now = Date.now();
    await this.deps.database
      .prepare(
        `INSERT INTO connections (user_id, snaptrade_user_id, user_secret_enc, status, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           snaptrade_user_id = excluded.snaptrade_user_id,
           user_secret_enc = excluded.user_secret_enc,
           status = excluded.status,
           updated_at = excluded.updated_at`,
      )
      .bind(userId, creds.userId, enc, status, now)
      .run();
  }

  private async replaceAccounts(userId: string, accounts: SnaptradeAccount[]) {
    const existing = await this.deps.database
      .prepare("SELECT id, external_id, included FROM accounts WHERE user_id = ?")
      .bind(userId)
      .all<AccountRow>();
    const kept = new Map(existing.results.map((row) => [row.external_id, row]));
    const seen = new Set<string>();
    const now = Date.now();
    for (const account of accounts) {
      seen.add(account.id);
      const prev = kept.get(account.id);
      if (prev) {
        await this.deps.database
          .prepare("UPDATE accounts SET mask = ?, brokerage = ?, paper = ? WHERE id = ?")
          .bind(account.mask, account.brokerage, account.paper ? 1 : 0, prev.id)
          .run();
      } else {
        await this.deps.database
          .prepare(
            "INSERT INTO accounts (id, user_id, external_id, mask, brokerage, paper, included, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)",
          )
          .bind(crypto.randomUUID(), userId, account.id, account.mask, account.brokerage, account.paper ? 1 : 0, now)
          .run();
      }
    }
    for (const row of existing.results) {
      if (!seen.has(row.external_id)) {
        await this.deps.database.prepare("DELETE FROM accounts WHERE id = ?").bind(row.id).run();
      }
    }
  }

  private async snaptrade() {
    const client = await Keys.from(this.deps).client();
    if (!client || !this.deps.tokenKey) throw new SnaptradeError("snaptrade_unconfigured", 503);
    return client;
  }
}

export { Connect };
