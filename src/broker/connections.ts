import { and, eq } from "drizzle-orm";
import type { BrokerAccount, BrokerFunds, BrokerToken } from "./broker";
import { Database } from "@/db/database";
import { activities, brokerAccounts, brokerConnections as connectionTable, fills, notes, positionSnapshots, positions } from "@/db/schema";
import { tokenVault, type TokenVault } from "@/token/vault";

export class BrokerConnections {
  constructor(private readonly vault: TokenVault) {}

  forUser(userId: string, brokerId: string) {
    const db = Database.current();
    const connection = db
      .select()
      .from(connectionTable)
      .where(and(eq(connectionTable.userId, userId), eq(connectionTable.broker, brokerId)))
      .get();
    if (connection) this.dropRoundedTwins(connection.id);
    const accounts = connection
      ? db.select().from(brokerAccounts).where(eq(brokerAccounts.connectionId, connection.id)).all()
      : [];
    return { connection: connection ?? null, accounts };
  }

  included(connectionId: string) {
    return Database.current()
      .select()
      .from(brokerAccounts)
      .where(and(eq(brokerAccounts.connectionId, connectionId), eq(brokerAccounts.included, 1)))
      .all();
  }

  saveAuthorization(userId: string, brokerId: string, token: BrokerToken, accounts: BrokerAccount[]) {
    const db = Database.current();
    const existing = db
      .select()
      .from(connectionTable)
      .where(and(eq(connectionTable.userId, userId), eq(connectionTable.broker, brokerId)))
      .get();
    const connectionId = existing?.id ?? crypto.randomUUID();
    const values = {
      status: "authorized",
      scope: token.scope,
      accessTokenEnc: this.vault.encrypt(token.accessToken),
      refreshTokenEnc: this.vault.encrypt(token.refreshToken),
      accessExpiresAt: Date.now() + token.expiresIn * 1000,
      lastError: null,
    };
    if (existing) {
      db.update(connectionTable).set(values).where(eq(connectionTable.id, connectionId)).run();
    } else {
      db.insert(connectionTable)
        .values({ id: connectionId, userId, broker: brokerId, fillCursor: "{}", ...values })
        .run();
    }
    this.upsertAccounts(connectionId, accounts);
    return connectionId;
  }

  upsertAccounts(connectionId: string, accounts: BrokerAccount[]) {
    const db = Database.current();
    const remote = accounts.filter((account) => !BrokerConnections.roundedId(account.accId));
    const local = db.select().from(brokerAccounts).where(eq(brokerAccounts.connectionId, connectionId)).all();
    const remoteIds = new Set(remote.map((account) => account.accId));
    for (const account of remote) {
      const sameCard = local.find((row) => row.cardMask === account.cardMask && row.accId !== account.accId);
      const row = local.find((item) => item.accId === account.accId);
      const included = row?.included ?? sameCard?.included ?? 0;
      if (row) {
        db.update(brokerAccounts)
          .set({ cardMask: account.cardMask, markets: JSON.stringify(account.markets), included })
          .where(eq(brokerAccounts.id, row.id))
          .run();
      } else {
        db.insert(brokerAccounts)
          .values({
            id: crypto.randomUUID(),
            connectionId,
            accId: account.accId,
            cardMask: account.cardMask,
            markets: JSON.stringify(account.markets),
            included,
          })
          .run();
      }
    }
    this.dropRoundedTwins(connectionId);
    const kept = db.select().from(brokerAccounts).where(eq(brokerAccounts.connectionId, connectionId)).all();
    for (const row of kept) {
      if (!remoteIds.has(row.accId) && !remote.some((account) => account.cardMask === row.cardMask)) {
        this.removeAccount(row.id);
      }
    }
  }

  private dropRoundedTwins(connectionId: string) {
    const db = Database.current();
    const local = db.select().from(brokerAccounts).where(eq(brokerAccounts.connectionId, connectionId)).all();
    for (const row of local) {
      if (!BrokerConnections.roundedId(row.accId)) continue;
      const precise = local.find((item) => item.cardMask === row.cardMask && item.accId !== row.accId && !BrokerConnections.roundedId(item.accId));
      if (!precise) continue;
      this.reassignAccount(row.id, precise.id);
      if (row.included === 1) {
        db.update(brokerAccounts).set({ included: 1 }).where(eq(brokerAccounts.id, precise.id)).run();
      }
      db.delete(brokerAccounts).where(eq(brokerAccounts.id, row.id)).run();
    }
  }

  private reassignAccount(fromId: string, toId: string) {
    const db = Database.current();
    db.update(positionSnapshots).set({ accountId: toId }).where(eq(positionSnapshots.accountId, fromId)).run();
    db.update(activities).set({ accountId: toId }).where(eq(activities.accountId, fromId)).run();
    const deals = db.select().from(fills).where(eq(fills.accountId, fromId)).all();
    for (const deal of deals) {
      const clash = db
        .select()
        .from(fills)
        .where(and(eq(fills.accountId, toId), eq(fills.dealId, deal.dealId)))
        .get();
      if (clash) db.delete(fills).where(eq(fills.id, deal.id)).run();
      else db.update(fills).set({ accountId: toId }).where(eq(fills.id, deal.id)).run();
    }
  }

  private removeAccount(accountId: string) {
    const db = Database.current();
    const snapshots = db.select().from(positionSnapshots).where(eq(positionSnapshots.accountId, accountId)).all();
    for (const snapshot of snapshots) {
      db.delete(positions).where(eq(positions.snapshotId, snapshot.id)).run();
      db.delete(positionSnapshots).where(eq(positionSnapshots.id, snapshot.id)).run();
    }
    const rows = db.select().from(activities).where(eq(activities.accountId, accountId)).all();
    for (const row of rows) {
      db.delete(notes).where(eq(notes.activityId, row.id)).run();
      db.delete(activities).where(eq(activities.id, row.id)).run();
    }
    db.delete(fills).where(eq(fills.accountId, accountId)).run();
    db.delete(brokerAccounts).where(eq(brokerAccounts.id, accountId)).run();
  }

  private static roundedId(accId: string) {
    return /^\d{16,}$/.test(accId) && String(Number(accId)) === accId;
  }

  saveFunds(accountId: string, funds: BrokerFunds) {
    Database.current()
      .update(brokerAccounts)
      .set({
        cash: funds.cash,
        totalAssets: funds.totalAssets,
        fundsCurrency: funds.currency,
        fundsJson: JSON.stringify(funds.balances),
      })
      .where(eq(brokerAccounts.id, accountId))
      .run();
  }

  setIncluded(connectionId: string, selected: Set<string>) {
    const db = Database.current();
    const accounts = db.select().from(brokerAccounts).where(eq(brokerAccounts.connectionId, connectionId)).all();
    for (const account of accounts) {
      db.update(brokerAccounts)
        .set({ included: selected.has(account.id) ? 1 : 0 })
        .where(eq(brokerAccounts.id, account.id))
        .run();
    }
  }
}

export const brokerConnections = new BrokerConnections(tokenVault);
