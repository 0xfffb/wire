import { asBool, asList, asRecord, asString } from "../lib/json";
import { asDec, formatYtd, mulDec, shanghaiDate } from "../lib/format";

const API = "https://api.snaptrade.com/api/v1";

export class SnaptradeError extends Error {
  constructor(
    readonly code: "reauth_needed" | "snaptrade_unavailable" | "snaptrade_unconfigured",
    readonly status: number,
    readonly detail?: string,
  ) {
    super(detail || code);
    this.name = "SnaptradeError";
  }
}

export type SnaptradeAccount = {
  id: string;
  mask: string;
  brokerage: string;
  paper: boolean;
};

export type SnaptradePosition = {
  code: string;
  name: string;
  ccy: string;
  price: string;
  qty: string;
  value: string;
  cost: string;
};

export type SnaptradeCash = {
  ccy: string;
  balance: string;
};

export type SnaptradeOrder = {
  externalId: string;
  code: string;
  ccy: string;
  side: "buy" | "sell";
  status: "open" | "partial" | "filled" | "cancelled" | "rejected";
  price: string;
  qty: string;
  amount: string;
  tradedAt: number;
};

export type SnaptradeCreds = {
  userId: string;
  userSecret: string;
};

type SnaptradeConfig = {
  clientId: string;
  consumerKey: string;
};

function sortValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortValue);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) out[key] = sortValue(obj[key]);
  return out;
}

function canonical(value: unknown) {
  return JSON.stringify(sortValue(value));
}

function queryString(params: Record<string, string>) {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

function nested(record: Record<string, unknown>, ...keys: string[]) {
  let current: unknown = record;
  for (const key of keys) {
    current = asRecord(current)[key];
  }
  return current;
}

function currencyCode(value: unknown) {
  if (typeof value === "string" && value) return value.toUpperCase();
  return asString(asRecord(value).code).toUpperCase() || "USD";
}

function symbolCode(row: Record<string, unknown>) {
  const instrument = asRecord(row.instrument);
  const symbol = asRecord(row.symbol);
  const inner = asRecord(symbol.symbol);
  return (
    asString(instrument.symbol) ||
    asString(instrument.raw_symbol) ||
    asString(inner.raw_symbol) ||
    asString(inner.code) ||
    asString(inner.ticker) ||
    asString(symbol.raw_symbol) ||
    asString(symbol.ticker) ||
    asString(row.ticker) ||
    asString(row.symbol)
  );
}

function symbolName(row: Record<string, unknown>) {
  const instrument = asRecord(row.instrument);
  const symbol = asRecord(row.symbol);
  const inner = asRecord(symbol.symbol);
  return (
    asString(instrument.description) ||
    asString(inner.description) ||
    asString(symbol.description) ||
    asString(row.description) ||
    symbolCode(row)
  );
}

function symbolCcy(row: Record<string, unknown>) {
  const instrument = asRecord(row.instrument);
  const symbol = asRecord(row.symbol);
  const inner = asRecord(symbol.symbol);
  return currencyCode(instrument.currency || inner.currency || symbol.currency || row.currency);
}

function mapStatus(value: string): SnaptradeOrder["status"] {
  const status = value.toLowerCase();
  if (status.includes("partial")) return "partial";
  if (status.includes("cancel")) return "cancelled";
  if (status.includes("reject")) return "rejected";
  if (status.includes("fill") || status.includes("execut") || status === "complete") return "filled";
  if (status.includes("open") || status.includes("pend") || status.includes("new")) return "open";
  return "filled";
}

function mapSide(value: string): SnaptradeOrder["side"] | null {
  const side = value.toLowerCase();
  if (side.includes("buy") || side === "bid") return "buy";
  if (side.includes("sell") || side === "ask") return "sell";
  return null;
}

function asTime(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e11 ? value * 1000 : value;
  }
  const text = asString(value);
  if (!text) return Date.now();
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

class Snaptrade {
  constructor(private readonly config: SnaptradeConfig) {}

  static of(clientId: string, consumerKey: string) {
    const id = clientId.trim();
    const secret = consumerKey.trim();
    if (!id || !secret) return null;
    return new Snaptrade({ clientId: id, consumerKey: secret });
  }

  async registerUser(userId: string) {
    const data = asRecord(await this.request("POST", "/snapTrade/registerUser", undefined, { userId }));
    const secret = asString(data.userSecret) || asString(data.user_secret);
    if (!secret) throw new SnaptradeError("snaptrade_unavailable", 502, "register_no_secret");
    return { userId: asString(data.userId) || asString(data.user_id) || userId, userSecret: secret };
  }

  async deleteUser(creds: SnaptradeCreds) {
    try {
      await this.request("POST", "/snapTrade/deleteUser", creds, undefined);
    } catch {
      /* local disconnect still proceeds */
    }
  }

  async login(input: { redirect: string; reconnect?: string }) {
    const body: Record<string, unknown> = {
      connectionType: "read",
      customRedirect: input.redirect,
      immediateRedirect: true,
    };
    if (input.reconnect) body.reconnect = input.reconnect;
    const data = asRecord(await this.request("POST", "/snapTrade/login", undefined, body));
    const url = asString(data.redirectURI) || asString(data.redirect_uri) || asString(data.redirectUrl);
    if (!url) throw new SnaptradeError("snaptrade_unavailable", 502, "login_no_redirect");
    return url;
  }

  async listAccounts(): Promise<SnaptradeAccount[]> {
    const rows = asList(await this.request("GET", "/accounts"));
    return rows.map((item) => {
      const row = asRecord(item);
      const auth = asRecord(row.brokerage_authorization);
      const brokerage = asRecord(auth.brokerage);
      const number = asString(row.number) || asString(row.id);
      const slug = asString(brokerage.slug).toUpperCase();
      const paper = asBool(row.is_paper) || slug === "SANDBOX";
      return {
        id: asString(row.id),
        mask: number.length <= 4 ? number : `····${number.slice(-4)}`,
        brokerage: asString(brokerage.name) || asString(row.institution_name) || asString(row.name) || "Broker",
        paper,
      };
    }).filter((row) => row.id);
  }

  async listCash(accountId: string): Promise<SnaptradeCash[]> {
    const rows = asList(await this.request("GET", `/accounts/${encodeURIComponent(accountId)}/balances`));
    const byCcy = new Map<string, number>();
    for (const item of rows) {
      const row = asRecord(item);
      const ccy = currencyCode(row.currency);
      const cash = Number(asDec(row.cash));
      if (!ccy || cash <= 0) continue;
      byCcy.set(ccy, (byCcy.get(ccy) ?? 0) + cash);
    }
    return [...byCcy.entries()].map(([ccy, balance]) => ({ ccy, balance: asDec(balance) }));
  }

  async listPositions(accountId: string): Promise<SnaptradePosition[]> {
    const rows = asList(await this.request("GET", `/accounts/${encodeURIComponent(accountId)}/positions/all`));
    return rows
      .map((item) => {
        const row = asRecord(item);
        if (asBool(row.cash_equivalent)) return null;
        const qty = asDec(row.units ?? row.quantity ?? row.qty);
        const price = asDec(row.price ?? row.last_price ?? nested(row, "price", "amount"));
        const avg = asDec(row.average_purchase_price ?? row.average_price ?? row.cost_basis);
        const market = asDec(row.market_value);
        const value = Number(market) > 0 ? market : mulDec(qty, price);
        const cost = Number(avg) > 0 ? mulDec(qty, avg) : asDec(row.cost_basis) !== "0" ? asDec(row.cost_basis) : value;
        return {
          code: symbolCode(row),
          name: symbolName(row),
          ccy: symbolCcy(row),
          price,
          qty,
          value,
          cost,
        };
      })
      .filter((row): row is SnaptradePosition => Boolean(row?.code && Number(row.qty) !== 0));
  }

  async listOrders(accountId: string): Promise<SnaptradeOrder[]> {
    const encoded = encodeURIComponent(accountId);
    let rows: unknown[] = [];
    try {
      rows = asList(await this.request("GET", `/accounts/${encoded}/recentOrders`, undefined, undefined, { days: "90" }));
    } catch {
      rows = asList(await this.request("GET", `/accounts/${encoded}/orders`, undefined, undefined, { days: "90" }));
    }
    const out: SnaptradeOrder[] = [];
    for (const item of rows) {
      const row = asRecord(item);
      const side = mapSide(asString(row.action ?? row.side ?? row.type));
      if (!side) continue;
      const qty = asDec(row.total_quantity ?? row.filled_quantity ?? row.units ?? row.quantity);
      const price = asDec(row.execution_price ?? row.average_fill_price ?? row.price);
      const code =
        symbolCode(asRecord(row.universal_symbol).symbol ? asRecord(row.universal_symbol) : row) ||
        symbolCode(asRecord(row.symbol)) ||
        asString(row.ticker);
      if (!code) continue;
      out.push({
        externalId: asString(row.brokerage_order_id || row.id) || crypto.randomUUID(),
        code,
        ccy: symbolCcy(asRecord(row.universal_symbol)) || symbolCcy(row),
        side,
        status: mapStatus(asString(row.status)),
        price,
        qty,
        amount: mulDec(qty, price),
        tradedAt: asTime(row.time_executed ?? row.time_placed ?? row.time),
      });
    }
    return out.sort((a, b) => b.tradedAt - a.tradedAt).slice(0, 50);
  }

  async ytd(accountId: string) {
    const year = shanghaiDate().slice(0, 4);
    try {
      const data = asRecord(
        await this.request("GET", "/performance/custom", undefined, undefined, {
          startDate: `${year}-01-01`,
          endDate: shanghaiDate(),
          accounts: accountId,
          frequency: "monthly",
        }),
      );
      return (
        formatYtd(data.totalReturn) ??
        formatYtd(data.percentReturn) ??
        formatYtd(nested(data, "total_return")) ??
        formatYtd(nested(data, "return", "percent")) ??
        formatYtd(asRecord(data.performance).percent) ??
        null
      );
    } catch {
      return null;
    }
  }

  private async request(
    method: string,
    path: string,
    creds?: Partial<SnaptradeCreds>,
    body?: unknown,
    extraQuery?: Record<string, string>,
  ) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const params: Record<string, string> = { clientId: this.config.clientId, timestamp };
    if (creds?.userId) params.userId = creds.userId;
    if (creds?.userSecret) params.userSecret = creds.userSecret;
    if (extraQuery) Object.assign(params, extraQuery);
    const query = queryString(params);
    const apiPath = `/api/v1${path}`;
    const payload = body && typeof body === "object" && Object.keys(asRecord(body)).length ? body : null;
    const signature = await this.sign({ content: payload, path: apiPath, query });
    const headers: Record<string, string> = { Accept: "application/json", Signature: signature };
    let encoded: string | undefined;
    if (payload) {
      encoded = JSON.stringify(payload);
      headers["Content-Type"] = "application/json";
    }
    const response = await fetch(`${API}${path}?${query}`, { method, headers, body: encoded });
    const text = await response.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        data = { detail: text.slice(0, 300) };
      }
    }
    if (!response.ok) {
      const record = asRecord(data);
      const detail =
        asString(record.detail) ||
        asString(record.message) ||
        asString(record.error) ||
        asString(asRecord(record.default_detail).message) ||
        text.slice(0, 300);
      console.error("snaptrade", method, path, response.status, detail);
      if (response.status === 401 || response.status === 403) throw new SnaptradeError("reauth_needed", response.status, detail);
      throw new SnaptradeError("snaptrade_unavailable", response.status, detail || undefined);
    }
    return data;
  }

  private async sign(payload: { content: unknown; path: string; query: string }) {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(this.config.consumerKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonical(payload)));
    const raw = new Uint8Array(bytes);
    let bin = "";
    for (const byte of raw) bin += String.fromCharCode(byte);
    return btoa(bin);
  }
}

export { Snaptrade };
