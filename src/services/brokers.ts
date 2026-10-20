import type { FutuBrokerage } from "../brokerage/futu";
import type { Deps } from "../deps";
import { isAccountMarket, parseAccountMarkets } from "../lib/copy";
import { randomBase64Url, sha256Base64Url } from "../lib/pkce";
import type { SqlDatabase } from "../storage/database";
import type { KvStore } from "../storage/kv";
import type { Queue } from "../storage/queue";
import type { ConsoleAccount } from "./console";

const BROKER = "futu";
const SCOPE = "trade:read";
const OAUTH_TTL_SEC = 10 * 60;
const CLIENT_KEY = "oauth:client:futu";
const TOKEN_PREFIX = "broker:";
const STALE_MS = 30 * 60 * 1000;
const QUEUE_BATCH = 100;

const BROKERS = [{ id: "futu", name: { zh: "富途", en: "Futu" }, ready: true }] as const;

type TokenStatus = "ok" | "reauth";

type TokenRecord = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshedAt: number;
  scope: string;
  clientId: string;
  status: TokenStatus;
};

type TokenMeta = {
  refreshedAt: number;
  status: TokenStatus;
};

type OauthState = {
  userId: string;
  verifier: string;
  clientId: string;
  redirectUri: string;
};

type ClientRecord = {
  clientId: string;
  redirectUri: string;
};

type AccountRow = {
  id: string;
  card_mask: string;
  markets: string;
  included: number;
  external_id: string;
};

function tokenKey(userId: string) {
  return `broker:${userId}:${BROKER}`;
}

function stateKey(state: string) {
  return `oauth:futu:${state}`;
}

function callbackUri(origin: string) {
  return `${origin}/oauth/futu/callback`;
}

class Brokers {
  constructor(
    private readonly db: SqlDatabase,
    private readonly kv: KvStore,
    private readonly futu: FutuBrokerage,
  ) {}

  static from(deps: Deps) {
    return new Brokers(deps.database, deps.kv, deps.brokerage.futu);
  }

  async refreshAccounts(userId: string) {
    const token = await this.accessToken(userId);
    if (!token) return;
    await this.upsertAccounts(userId, await this.futu.listAccounts(token));
  }

  async view(userId: string) {
    const link = await this.connected(userId);
    const token = link ? await this.readToken(userId) : null;
    if (link && token?.status !== "reauth") {
      try {
        await this.refreshAccounts(userId);
      } catch {
        /* show saved accounts */
      }
    }
    return {
      connected: Boolean(link),
      broker: link,
      needsReauth: Boolean(link && token?.status === "reauth"),
      brokers: BROKERS,
      accounts: await this.accounts(userId),
    };
  }

  async start(userId: string, origin: string) {
    const redirectUri = callbackUri(origin);
    const clientId = await this.clientId(redirectUri);
    const verifier = randomBase64Url(32);
    const state = randomBase64Url(16);
    await this.kv.put(
      stateKey(state),
      JSON.stringify({ userId, verifier, clientId, redirectUri } satisfies OauthState),
      { ttlSec: OAUTH_TTL_SEC },
    );
    return {
      url: this.futu.buildAuthorizeUrl({
        clientId,
        redirectUri,
        state,
        codeChallenge: await sha256Base64Url(verifier),
        scope: SCOPE,
      }),
    };
  }

  async finish(input: { code?: string; state?: string; error?: string; userId?: string }) {
    if (input.error === "access_denied") return { error: "denied" as const };
    if (input.error) return { error: "oauth" as const };
    if (!input.code || !input.state) return { error: "oauth" as const };
    if (!input.userId) return { error: "unauthorized" as const };

    const raw = await this.kv.get(stateKey(input.state));
    await this.kv.delete(stateKey(input.state));
    if (!raw) return { error: "state" as const };

    let saved: OauthState;
    try {
      saved = JSON.parse(raw) as OauthState;
    } catch {
      return { error: "state" as const };
    }
    if (saved.userId !== input.userId) return { error: "state" as const };

    try {
      const token = await this.futu.exchangeCode({
        clientId: saved.clientId,
        code: input.code,
        redirectUri: saved.redirectUri,
        codeVerifier: saved.verifier,
      });
      if (!token.refreshToken) return { error: "oauth" as const };
      await this.writeToken(input.userId, {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        accessExpiresAt: token.accessExpiresAt ?? Date.now() + (token.expiresIn ?? 7200) * 1000,
        refreshedAt: Date.now(),
        scope: token.scope ?? SCOPE,
        clientId: saved.clientId,
        status: "ok",
      });
      await this.db
        .prepare("INSERT OR IGNORE INTO broker_links (user_id, broker, created_at) VALUES (?, ?, ?)")
        .bind(input.userId, BROKER, Date.now())
        .run();
      const accounts = await this.futu.listAccounts(token.accessToken);
      await this.upsertAccounts(input.userId, accounts);
    } catch {
      return { error: "oauth" as const };
    }
    return { ok: true as const };
  }

  async disconnect(userId: string) {
    await this.kv.delete(tokenKey(userId));
    await this.db.prepare("DELETE FROM broker_links WHERE user_id = ? AND broker = ?").bind(userId, BROKER).run();
  }

  async setIncluded(userId: string, ids: string[]) {
    const wanted = new Set(ids);
    const rows = await this.accountRows(userId);
    const statements = rows.map((row) =>
      this.db
        .prepare("UPDATE accounts SET included = ? WHERE id = ? AND user_id = ?")
        .bind(wanted.has(row.id) ? 1 : 0, row.id, userId),
    );
    if (statements.length) await this.db.batch(statements);
    return this.view(userId);
  }

  async accessToken(userId: string) {
    const current = await this.readToken(userId);
    if (!current) return null;
    if (current.status === "reauth") return null;
    if (current.accessExpiresAt > Date.now() + 60_000) return current.accessToken;
    return this.refresh(userId);
  }

  async enqueueDue(queue: Queue) {
    const now = Date.now();
    const messages: { type: "refresh"; payload: { userId: string } }[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.kv.list({ prefix: TOKEN_PREFIX, cursor });
      for (const key of page.keys) {
        const userId = userIdFromTokenKey(key.name);
        if (!userId || !isDue(key.metadata, now)) continue;
        messages.push({ type: "refresh", payload: { userId } });
      }
      cursor = page.cursor;
    } while (cursor);
    for (let i = 0; i < messages.length; i += QUEUE_BATCH) {
      await queue.sendBatch(messages.slice(i, i + QUEUE_BATCH));
    }
  }

  async includeAllIfNone(userId: string) {
    const rows = await this.accountRows(userId);
    if (rows.length && rows.every((row) => row.included === 0)) {
      await this.db.prepare("UPDATE accounts SET included = 1 WHERE user_id = ?").bind(userId).run();
    }
  }

  async enqueueAllSync(queue: Queue) {
    const { results } = await this.db
      .prepare("SELECT id, user_id FROM accounts WHERE included = 1")
      .all<{ id: string; user_id: string }>();
    const messages = results.map((row) => ({
      type: "sync" as const,
      payload: { userId: row.user_id, accountId: row.id },
    }));
    for (let i = 0; i < messages.length; i += QUEUE_BATCH) {
      await queue.sendBatch(messages.slice(i, i + QUEUE_BATCH));
    }
  }

  async enqueueSync(queue: Queue, userId: string, opts?: { includeAllIfEmpty?: boolean }) {
    if (opts?.includeAllIfEmpty) await this.includeAllIfNone(userId);
    const rows = await this.accountRows(userId);
    const messages = rows
      .filter((row) => row.included === 1)
      .map((row) => ({
        type: "sync" as const,
        payload: { userId, accountId: row.id },
      }));
    for (let i = 0; i < messages.length; i += QUEUE_BATCH) {
      await queue.sendBatch(messages.slice(i, i + QUEUE_BATCH));
    }
  }

  async refresh(userId: string) {
    const current = await this.readToken(userId);
    if (!current || current.status === "reauth") return null;
    try {
      const next = await this.futu.refreshToken(current.refreshToken, current.clientId);
      const saved: TokenRecord = {
        ...current,
        accessToken: next.accessToken,
        refreshToken: next.refreshToken || current.refreshToken,
        accessExpiresAt: next.accessExpiresAt ?? Date.now() + (next.expiresIn ?? 7200) * 1000,
        refreshedAt: Date.now(),
        scope: next.scope ?? current.scope,
        status: "ok",
      };
      await this.writeToken(userId, saved);
      return saved.accessToken;
    } catch {
      await this.writeToken(userId, { ...current, status: "reauth" });
      return null;
    }
  }

  private async clientId(redirectUri: string) {
    const raw = await this.kv.get(CLIENT_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw) as ClientRecord;
        if (saved.clientId && saved.redirectUri === redirectUri) return saved.clientId;
      } catch {
        /* register again */
      }
    }
    const { clientId } = await this.futu.register(redirectUri);
    await this.kv.put(CLIENT_KEY, JSON.stringify({ clientId, redirectUri } satisfies ClientRecord));
    return clientId;
  }

  private async connected(userId: string) {
    const row = await this.db
      .prepare("SELECT broker FROM broker_links WHERE user_id = ? LIMIT 1")
      .bind(userId)
      .first<{ broker: string }>();
    return row?.broker ?? null;
  }

  private async accounts(userId: string): Promise<ConsoleAccount[]> {
    return (await this.accountRows(userId)).map(
      (row) =>
        ({
          id: row.id,
          mask: row.card_mask || row.id,
          markets: parseAccountMarkets(row.markets),
          included: row.included === 1,
        }) satisfies ConsoleAccount,
    );
  }

  private async accountRows(userId: string) {
    const { results } = await this.db
      .prepare(
        "SELECT id, card_mask, markets, included, external_id FROM accounts WHERE user_id = ? ORDER BY created_at, id",
      )
      .bind(userId)
      .all<AccountRow>();
    return results;
  }

  private async upsertAccounts(userId: string, accounts: { accId: string; cardMask: string; markets: string[] }[]) {
    const now = Date.now();
    for (const account of accounts) {
      if (!account.accId) continue;
      const markets = JSON.stringify(account.markets.filter(isAccountMarket));
      const existing = await this.db
        .prepare("SELECT id, user_id FROM accounts WHERE broker = ? AND external_id = ? LIMIT 1")
        .bind(BROKER, account.accId)
        .first<{ id: string; user_id: string }>();
      if (existing) {
        if (existing.user_id !== userId) continue;
        await this.db
          .prepare("UPDATE accounts SET card_mask = ?, markets = ? WHERE id = ?")
          .bind(account.cardMask, markets, existing.id)
          .run();
        continue;
      }
      await this.db
        .prepare(
          `INSERT INTO accounts (id, user_id, broker, external_id, card_mask, markets, included, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        )
        .bind(crypto.randomUUID(), userId, BROKER, account.accId, account.cardMask, markets, now)
        .run();
    }
  }

  private async readToken(userId: string) {
    const raw = await this.kv.get(tokenKey(userId));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as TokenRecord;
      if (!parsed.accessToken || !parsed.refreshToken || !parsed.clientId) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private writeToken(userId: string, record: TokenRecord) {
    const refreshedAt = record.refreshedAt || Date.now();
    const saved = { ...record, refreshedAt };
    return this.kv.put(tokenKey(userId), JSON.stringify(saved), {
      metadata: { refreshedAt, status: saved.status } satisfies TokenMeta,
    });
  }
}

function userIdFromTokenKey(name: string) {
  const match = /^broker:([^:]+):futu$/.exec(name);
  return match?.[1] ?? null;
}

function isDue(metadata: unknown, now: number) {
  const meta = metadata && typeof metadata === "object" ? (metadata as TokenMeta) : null;
  if (meta?.status === "reauth") return false;
  const refreshedAt = typeof meta?.refreshedAt === "number" ? meta.refreshedAt : 0;
  return now - refreshedAt >= STALE_MS;
}

export { Brokers, BROKERS };
export type { TokenRecord };
