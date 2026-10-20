import type { Copy, Market } from "../lib/copy";
import { parseMarkets } from "../lib/copy";
import { daysLeft } from "../lib/format";
import type { SqlDatabase } from "../storage/database";
import { Ledger, type HoldingRow, type OrderRow } from "./ledger";

export type Audience = "public" | "subs";
export type Access = "locked" | "preview" | "full" | "empty";
export type PublisherStatus = "pending" | "approved";

export type PublisherCard = {
  handle: string;
  name: string;
  bio: Copy;
  markets: Market[];
  ytd: string;
  subscribers: number;
  price: number;
};

export type PublicHolding = {
  code: string;
  name: Copy;
  side: HoldingRow["side"] | null;
  qty: string | null;
  cost: string | null;
  value: string | null;
  pl: string | null;
};

export type PublicFill = {
  time: string;
  code: string;
  name: Copy;
  currency: string;
  side: OrderRow["side"] | null;
  qty: string | null;
  price: string | null;
  amount: string | null;
};

export type PublisherHome = PublisherCard & {
  access: Access;
  subscribed: boolean;
  daysLeft: number | null;
  me: boolean;
  holdings: PublicHolding[];
  fills: PublicFill[];
};

export type PublisherRecord = {
  userId: string;
  status: PublisherStatus;
  audience: Audience;
  listed: boolean;
  markets: Market[];
  price: number;
  subscribers: number;
  ytd: string;
  note: string;
};

type PublisherJoinRow = {
  user_id: string;
  handle: string;
  display_name: string;
  bio_zh: string;
  bio_en: string;
  status: PublisherStatus;
  audience: Audience;
  listed: number;
  markets: string;
  price: number;
  subscribers: number;
  ytd: string;
  note: string;
};

const HIDDEN = "**";
const PREVIEW_CLEAR = 3;
const PREVIEW_MAX = 6;

function cardFromRow(row: PublisherJoinRow): PublisherCard {
  return {
    handle: row.handle,
    name: row.display_name,
    bio: { zh: row.bio_zh, en: row.bio_en },
    markets: parseMarkets(row.markets),
    ytd: row.ytd,
    subscribers: row.subscribers,
    price: row.price,
  };
}

function recordFromRow(row: PublisherJoinRow): PublisherRecord {
  return {
    userId: row.user_id,
    status: row.status,
    audience: row.audience,
    listed: row.listed !== 0,
    markets: parseMarkets(row.markets),
    price: row.price,
    subscribers: row.subscribers,
    ytd: row.ytd,
    note: row.note,
  };
}

const HIDDEN_NAME = { zh: HIDDEN, en: HIDDEN };

function peekHolding(row: HoldingRow): PublicHolding {
  return {
    code: row.code,
    name: row.name,
    side: row.side,
    qty: HIDDEN,
    cost: HIDDEN,
    value: HIDDEN,
    pl: HIDDEN,
  };
}

function fogHolding(): PublicHolding {
  return {
    code: HIDDEN,
    name: HIDDEN_NAME,
    side: null,
    qty: HIDDEN,
    cost: HIDDEN,
    value: HIDDEN,
    pl: HIDDEN,
  };
}

function peekFill(row: OrderRow): PublicFill {
  return {
    time: row.time,
    code: row.code,
    name: row.name,
    currency: row.currency,
    side: row.side,
    qty: HIDDEN,
    price: HIDDEN,
    amount: HIDDEN,
  };
}

function fogFill(): PublicFill {
  return {
    time: HIDDEN,
    code: HIDDEN,
    name: HIDDEN_NAME,
    currency: HIDDEN,
    side: null,
    qty: HIDDEN,
    price: HIDDEN,
    amount: HIDDEN,
  };
}

function previewRows<T, R>(rows: T[], peek: (row: T) => R, fog: () => R): R[] {
  if (!rows.length) return [];
  const shown = rows.slice(0, PREVIEW_CLEAR).map(peek);
  while (shown.length < PREVIEW_MAX) shown.push(fog());
  return shown;
}

class Publishers {
  private readonly ledger: Ledger;

  constructor(private readonly db: SqlDatabase) {
    this.ledger = new Ledger(db);
  }

  async listApproved() {
    const { results } = await this.db
      .prepare(
        `SELECT pub.user_id, u.handle, p.display_name, p.bio_zh, p.bio_en,
                pub.status, pub.audience, pub.listed, pub.markets, pub.price, pub.subscribers, pub.ytd, pub.note
         FROM publishers pub
         JOIN users u ON u.id = pub.user_id
         JOIN profiles p ON p.user_id = pub.user_id
         WHERE pub.status = 'approved' AND pub.listed != 0
         ORDER BY pub.subscribers DESC`,
      )
      .all<PublisherJoinRow>();
    return results.map(cardFromRow);
  }

  async getRecord(userId: string) {
    const row = await this.db
      .prepare(
        `SELECT pub.user_id, u.handle, p.display_name, p.bio_zh, p.bio_en,
                pub.status, pub.audience, pub.listed, pub.markets, pub.price, pub.subscribers, pub.ytd, pub.note
         FROM publishers pub
         JOIN users u ON u.id = pub.user_id
         JOIN profiles p ON p.user_id = pub.user_id
         WHERE pub.user_id = ?
         LIMIT 1`,
      )
      .bind(userId)
      .first<PublisherJoinRow>();
    return row ? recordFromRow(row) : null;
  }

  async getApprovedByHandle(handle: string) {
    const row = await this.db
      .prepare(
        `SELECT pub.user_id, u.handle, p.display_name, p.bio_zh, p.bio_en,
                pub.status, pub.audience, pub.listed, pub.markets, pub.price, pub.subscribers, pub.ytd, pub.note
         FROM publishers pub
         JOIN users u ON u.id = pub.user_id
         JOIN profiles p ON p.user_id = pub.user_id
         WHERE u.handle = ? AND pub.status = 'approved'
         LIMIT 1`,
      )
      .bind(handle)
      .first<PublisherJoinRow>();
    return row;
  }

  async subscription(subscriberId: string, publisherId: string, now = Date.now()) {
    const row = await this.db
      .prepare(
        `SELECT expires_at FROM subscriptions
         WHERE subscriber_id = ? AND publisher_id = ? AND expires_at > ?
         LIMIT 1`,
      )
      .bind(subscriberId, publisherId, now)
      .first<{ expires_at: number }>();
    return row ? { expiresAt: row.expires_at, daysLeft: daysLeft(row.expires_at, now) } : null;
  }

  async listMine(subscriberId: string, now = Date.now()) {
    const { results } = await this.db
      .prepare(
        `SELECT pub.user_id, u.handle, p.display_name, p.bio_zh, p.bio_en,
                pub.status, pub.audience, pub.listed, pub.markets, pub.price, pub.subscribers, pub.ytd, pub.note,
                s.expires_at
         FROM subscriptions s
         JOIN publishers pub ON pub.user_id = s.publisher_id
         JOIN users u ON u.id = pub.user_id
         JOIN profiles p ON p.user_id = pub.user_id
         WHERE s.subscriber_id = ? AND s.expires_at > ? AND pub.status = 'approved'
         ORDER BY s.expires_at ASC`,
      )
      .bind(subscriberId, now)
      .all<PublisherJoinRow & { expires_at: number }>();

    return results.map((row) => ({
      ...cardFromRow(row),
      daysLeft: daysLeft(row.expires_at, now),
    }));
  }

  async apply(userId: string, input: { markets: Market[]; note: string }) {
    const current = await this.getRecord(userId);
    const markets = JSON.stringify(input.markets);
    if (current?.status === "approved") return { error: "already_publisher" as const };
    if (current) {
      await this.db
        .prepare("UPDATE publishers SET markets = ?, note = ? WHERE user_id = ?")
        .bind(markets, input.note, userId)
        .run();
      return { status: "pending" as const };
    }
    await this.db
      .prepare(
        `INSERT INTO publishers (user_id, status, audience, listed, markets, price, subscribers, ytd, note, created_at)
         VALUES (?, 'pending', 'public', 1, ?, 29, 0, '—', ?, ?)`,
      )
      .bind(userId, markets, input.note, Date.now())
      .run();
    return { status: "pending" as const };
  }

  async approve(userId: string) {
    const current = await this.getRecord(userId);
    if (!current) return { error: "not_found" as const };
    if (current.status === "approved") return { status: "approved" as const };
    await this.db.prepare("UPDATE publishers SET status = 'approved' WHERE user_id = ?").bind(userId).run();
    return { status: "approved" as const };
  }

  async setShare(userId: string, input: { listed?: boolean; price?: number }) {
    const sets: string[] = [];
    const binds: (string | number)[] = [];
    if (input.listed != null) {
      sets.push("listed = ?");
      binds.push(input.listed ? 1 : 0);
    }
    if (input.price != null) {
      sets.push("price = ?");
      binds.push(input.price);
    }
    if (!sets.length) return;
    binds.push(userId);
    await this.db.prepare(`UPDATE publishers SET ${sets.join(", ")} WHERE user_id = ?`).bind(...binds).run();
  }

  async home(handle: string, viewerId: string | undefined): Promise<PublisherHome | null> {
    const row = await this.getApprovedByHandle(handle);
    if (!row) return null;

    const me = viewerId === row.user_id;
    const sub = viewerId && !me ? await this.subscription(viewerId, row.user_id) : null;
    const subscribed = Boolean(sub);
    const holdings = await this.ledger.holdings(row.user_id, true);
    const fills = await this.ledger.orders(row.user_id, true);
    const entitled = me || subscribed;
    const access: Access = entitled
      ? holdings.length
        ? "full"
        : "empty"
      : "preview";

    return {
      ...cardFromRow(row),
      access,
      subscribed,
      daysLeft: sub?.daysLeft ?? null,
      me,
      holdings: projectHoldings(holdings, access),
      fills: projectFills(fills, access),
    };
  }
}

function projectHoldings(rows: HoldingRow[], access: Access): PublicHolding[] {
  if (access === "locked") return [];
  if (access === "full" || access === "empty") {
    return rows.map((row) => ({
      code: row.code,
      name: row.name,
      side: row.side,
      qty: row.qty,
      cost: row.cost,
      value: row.value,
      pl: row.pl,
    }));
  }
  return previewRows(
    rows.filter((row) => row.side !== "flat"),
    peekHolding,
    fogHolding,
  );
}

function projectFills(rows: OrderRow[], access: Access): PublicFill[] {
  if (access === "locked") return [];
  if (access === "full" || access === "empty") {
    return rows.map((row) => ({
      time: row.time,
      code: row.code,
      name: row.name,
      currency: row.currency,
      side: row.side,
      qty: row.qty,
      price: row.price,
      amount: row.amount,
    }));
  }
  return previewRows(rows, peekFill, fogFill);
}

export { Publishers };
