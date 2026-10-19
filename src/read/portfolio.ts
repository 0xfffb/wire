import { and, desc, eq } from "drizzle-orm";
import { Database } from "@/db/database";
import { activities, follows, notes, positionSnapshots, positions, publisherProfiles, sharePolicies, webhooks } from "@/db/schema";

export type ReturnPoint = { at: number; rate: number };
import { brokerConnections } from "@/broker/connections";
import { ScaledDecimal } from "./scaled-decimal";

export type PrivateHolding = {
  accountId: string;
  cardMask: string;
  code: string;
  stockName: string;
  side: string;
  qty: string;
  costPrice: string;
  marketVal: string;
  plRatio: string;
  currency: string;
  syncedAt: number;
};

export type PublicHolding = {
  code: string;
  stockName: string;
  side: string;
  qty: string;
  marketVal: string;
  currency: string;
  weight: string;
  plRatio: string | null;
  costPrice: string | null;
};

export type ActivityView = {
  id: string;
  kind: string;
  code: string;
  stockName: string;
  side: string;
  qty: string | null;
  price: string | null;
  createdAt: number;
  note: string | null;
};

const KIND_LABEL: Record<string, string> = {
  opened: "新建",
  increased: "加仓",
  decreased: "减仓",
  closed: "清仓",
  fill: "成交",
};

export class PortfolioReader {
  kindLabel(kind: string) {
    return KIND_LABEL[kind] ?? kind;
  }

  privateHoldings(userId: string): PrivateHolding[] {
    const { accounts } = brokerConnections.forUser(userId, "futu");
    const included = accounts.filter((account) => account.included === 1);
    const db = Database.current();
    const rows: PrivateHolding[] = [];
    for (const account of included) {
      const snapshot = db
        .select()
        .from(positionSnapshots)
        .where(eq(positionSnapshots.accountId, account.id))
        .orderBy(desc(positionSnapshots.syncedAt))
        .get();
      if (!snapshot) continue;
      const holdings = db.select().from(positions).where(eq(positions.snapshotId, snapshot.id)).all();
      for (const holding of holdings) {
        rows.push({
          accountId: account.id,
          cardMask: account.cardMask,
          code: holding.code,
          stockName: holding.stockName,
          side: holding.side,
          qty: holding.qty,
          costPrice: holding.costPrice,
          marketVal: holding.marketVal,
          plRatio: holding.plRatioValid ? holding.plRatio : "",
          currency: holding.currency,
          syncedAt: snapshot.syncedAt,
        });
      }
    }
    return rows;
  }

  privateActivities(userId: string): ActivityView[] {
    const { accounts } = brokerConnections.forUser(userId, "futu");
    const db = Database.current();
    const rows: ActivityView[] = [];
    for (const account of accounts.filter((item) => item.included === 1)) {
      const items = db.select().from(activities).where(eq(activities.accountId, account.id)).orderBy(desc(activities.createdAt)).all();
      for (const item of items) {
        const note = db.select().from(notes).where(eq(notes.activityId, item.id)).get();
        rows.push({
          id: item.id,
          kind: item.kind,
          code: item.code,
          stockName: item.stockName,
          side: item.side,
          qty: item.qty,
          price: item.price,
          createdAt: item.createdAt,
          note: note?.body ?? null,
        });
      }
    }
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  }

  subscribed(publisherId: string, viewerId: string | null) {
    if (!viewerId) return false;
    if (viewerId === publisherId) return true;
    return this.isFollowing(viewerId, publisherId);
  }

  canRead(publisherId: string, viewerId: string | null) {
    if (viewerId === publisherId) return true;
    const db = Database.current();
    const policy = db.select().from(sharePolicies).where(eq(sharePolicies.userId, publisherId)).get();
    if (policy?.audience === "public") return true;
    return this.subscribed(publisherId, viewerId);
  }

  curve(publisherId: string): ReturnPoint[] {
    const { accounts } = brokerConnections.forUser(publisherId, "futu");
    const included = accounts.filter((account) => account.included === 1);
    const db = Database.current();
    const series = included.map((account) =>
      db
        .select()
        .from(positionSnapshots)
        .where(eq(positionSnapshots.accountId, account.id))
        .orderBy(positionSnapshots.syncedAt)
        .all()
        .map((snapshot) => ({
          at: snapshot.syncedAt,
          rows: db.select().from(positions).where(eq(positions.snapshotId, snapshot.id)).all(),
        })),
    );
    const minutes = [...new Set(series.flat().map((snapshot) => Math.floor(snapshot.at / 60_000)))].sort((a, b) => a - b);
    const points: ReturnPoint[] = [];
    for (const minute of minutes) {
      const end = (minute + 1) * 60_000;
      const rows = series.flatMap((snapshots) => {
        const current = [...snapshots].reverse().find((snapshot) => snapshot.at < end);
        return current?.rows ?? [];
      });
      const rate = this.weightedRate(rows);
      if (rate == null) continue;
      points.push({ at: minute * 60_000, rate });
    }
    return points;
  }

  private weightedRate(rows: Array<{ marketVal: string; plRatio: string; plRatioValid: number }>) {
    if (rows.length === 0) return 0;
    let base = 0n;
    let weighted = 0n;
    for (const row of rows) {
      if (!row.plRatioValid || !row.plRatio) continue;
      const market = ScaledDecimal.parse(row.marketVal || "0").value;
      const ratio = ScaledDecimal.parse(row.plRatio).value;
      const size = market < 0n ? -market : market;
      if (size === 0n) continue;
      base += size;
      weighted += size * ratio;
    }
    if (base === 0n) return null;
    return Number(new ScaledDecimal(weighted / base).format());
  }

  returnRate(publisherId: string) {
    const holdings = this.privateHoldings(publisherId).filter((holding) => holding.plRatio);
    let base = 0n;
    let weighted = 0n;
    for (const holding of holdings) {
      const market = ScaledDecimal.parse(holding.marketVal || "0").value;
      const ratio = ScaledDecimal.parse(holding.plRatio).value;
      const size = market < 0n ? -market : market;
      if (size === 0n) continue;
      base += size;
      weighted += size * ratio;
    }
    if (base === 0n) return null;
    return new ScaledDecimal(weighted / base).format();
  }

  summary(publisherId: string) {
    const db = Database.current();
    const policy = db.select().from(sharePolicies).where(eq(sharePolicies.userId, publisherId)).get();
    const { accounts } = brokerConnections.forUser(publisherId, "futu");
    const markets = new Set<string>();
    for (const account of accounts.filter((item) => item.included === 1)) {
      for (const market of JSON.parse(account.markets || "[]") as string[]) markets.add(market);
    }
    const holdings = this.privateHoldings(publisherId);
    const curve = this.curve(publisherId);
    const latest = curve.at(-1);
    return {
      returnRate: latest ? latest.rate.toFixed(2) : this.returnRate(publisherId),
      changeRate: null as string | null,
      curve,
      subscribeAmount: policy?.subscribeAmount ?? "0",
      markets: [...markets],
      holdingCount: holdings.length,
      syncedAt: holdings[0]?.syncedAt ?? null,
    };
  }

  webhooks(followerId: string, publisherId: string) {
    return Database.current()
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.followerId, followerId), eq(webhooks.publisherId, publisherId)))
      .all();
  }

  subscription(followerId: string, publisherId: string) {
    const row = Database.current()
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.publisherId, publisherId)))
      .get();
    if (!row || row.expiresAt <= Date.now()) return null;
    return row;
  }

  isFollowing(followerId: string, publisherId: string) {
    return Boolean(this.subscription(followerId, publisherId));
  }

  publicView(publisherId: string) {
    const db = Database.current();
    const policy = db.select().from(sharePolicies).where(eq(sharePolicies.userId, publisherId)).get();
    const holdings = this.privateHoldings(publisherId);
    const total = ScaledDecimal.sum(holdings.map((holding) => ScaledDecimal.parse(holding.marketVal || "0")));
    const projected: PublicHolding[] = holdings.map((holding) => ({
      code: holding.code,
      stockName: holding.stockName,
      side: holding.side,
      qty: holding.qty,
      marketVal: holding.marketVal,
      currency: holding.currency,
      weight: ScaledDecimal.parse(holding.marketVal || "0").weightPercent(total),
      plRatio: holding.plRatio || null,
      costPrice: holding.costPrice || null,
    }));
    const activity = this.privateActivities(publisherId);
    const profile = db.select().from(publisherProfiles).where(eq(publisherProfiles.userId, publisherId)).get();
    return {
      profile,
      policy,
      holdings: projected,
      activity,
      funds: this.funds(publisherId),
      syncedAt: holdings[0]?.syncedAt ?? null,
    };
  }

  funds(userId: string) {
    return brokerConnections
      .forUser(userId, "futu")
      .accounts.filter((account) => account.included === 1)
      .map((account) => ({
        markets: JSON.parse(account.markets || "[]") as string[],
        cash: account.cash,
        totalAssets: account.totalAssets,
        currency: account.fundsCurrency,
        balances: JSON.parse(account.fundsJson || "[]") as Array<{ currency: string; cash: string }>,
      }));
  }

  overview(userId: string) {
    const { connection, accounts } = brokerConnections.forUser(userId, "futu");
    const holdings = this.privateHoldings(userId);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const today = this.privateActivities(userId).filter((item) => item.createdAt >= start.getTime()).length;
    return {
      connection,
      accountCount: accounts.filter((account) => account.included === 1).length,
      holdingCount: holdings.length,
      today,
    };
  }

  discover() {
    const db = Database.current();
    return db
      .select()
      .from(publisherProfiles)
      .all()
      .filter((profile) => db.select().from(sharePolicies).where(eq(sharePolicies.userId, profile.userId)).get()?.audience === "public")
      .map((profile) => ({ ...profile, ...this.summary(profile.userId) }));
  }

  following(userId: string) {
    const db = Database.current();
    return db
      .select()
      .from(follows)
      .where(eq(follows.followerId, userId))
      .all()
      .filter((follow) => follow.expiresAt > Date.now())
      .map((follow) => {
        const profile = db.select().from(publisherProfiles).where(eq(publisherProfiles.userId, follow.publisherId)).get();
        return profile ? { ...profile, expiresAt: follow.expiresAt } : null;
      })
      .filter((profile): profile is NonNullable<typeof profile> => Boolean(profile));
  }
}

export const portfolio = new PortfolioReader();
