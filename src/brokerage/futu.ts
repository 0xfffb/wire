import {
  Brokerage,
  type AuthorizeUrlInput,
  type BrokerAccount,
  type BrokerCash,
  type BrokerPosition,
  type BrokerToken,
  type ExchangeCodeInput,
  type FillPage,
  type ListFillsInput,
} from "./index";

const API = "https://webapi.futunn.com";
const SCOPE = "trade:read";

const ENABLE_MARKET: Record<number, string> = {
  1: "hk",
  2: "us",
};

const CASH_FIELDS: Array<[string, string]> = [
  ["HKD", "hk_cash"],
  ["USD", "us_cash"],
  ["CNH", "cn_cash"],
  ["JPY", "jp_cash"],
  ["SGD", "sg_cash"],
  ["AUD", "au_cash"],
  ["MYR", "my_cash"],
  ["KRW", "kr_cash"],
];

type Envelope = { s?: string; errcode?: number; errmsg?: string; d?: unknown };

class FutuBrokerage extends Brokerage {
  readonly id = "futu";

  async register(redirectUri: string) {
    const response = await this.request(`${API}/oauth2/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        redirect_uris: [redirectUri],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        client_name: "Wire",
      }),
    });
    const json = (await response.json()) as { client_id?: string; error?: string };
    if (!response.ok || !json.client_id) {
      throw new Error(json.error || "futu_register_failed");
    }
    return { clientId: json.client_id };
  }

  buildAuthorizeUrl(input: AuthorizeUrlInput) {
    const params = new URLSearchParams({
      client_id: input.clientId,
      code_challenge: input.codeChallenge,
      code_challenge_method: "S256",
      redirect_uri: input.redirectUri,
      response_type: "code",
      state: input.state,
      scope: input.scope || SCOPE,
    });
    return `${API}/oauth2/authorize/confirm?${params}`;
  }

  exchangeCode(input: ExchangeCodeInput) {
    return this.tokenRequest(
      new URLSearchParams({
        grant_type: "authorization_code",
        code: input.code,
        client_id: input.clientId,
        redirect_uri: input.redirectUri,
        code_verifier: input.codeVerifier,
      }),
    );
  }

  refreshToken(refreshToken: string, clientId: string) {
    return this.tokenRequest(
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
      }),
    );
  }

  async listAccounts(accessToken: string): Promise<BrokerAccount[]> {
    const data = asRecord(await this.get("/api/v1.0/accounts/authorized_trd_accs", accessToken));
    const accounts = Array.isArray(data.accounts) ? data.accounts : [];
    return accounts.map((item) => {
      const account = asRecord(item);
      const markets = Array.isArray(account.enable_market)
        ? account.enable_market.filter((value): value is number => typeof value === "number")
        : [];
      return {
        accId: asString(account.account_id),
        cardMask: maskCard(asString(account.account_card_number)),
        markets: mapMarkets(markets),
      };
    });
  }

  async listPositions(accessToken: string, accountId: string): Promise<BrokerPosition[]> {
    const data = await this.get(`/api/v1.0/accounts/${encodeURIComponent(accountId)}/positions`, accessToken);
    const rows = Array.isArray(data) ? data : Array.isArray(asRecord(data).positions) ? asRecord(data).positions : [];
    if (!Array.isArray(rows)) return [];
    return rows.map((item) => {
      const row = asRecord(item);
      return {
        code: asString(row.code),
        stockName: asString(row.stock_name),
        side: asString(row.position_side) || "LONG",
        qty: asString(row.qty) || "0",
        costPrice: asString(row.cost_price),
        marketVal: asString(row.market_val) || "0",
        plRatio: asString(row.pl_ratio),
        plRatioValid: row.pl_ratio_valid === true,
        currency: asString(row.currency),
      };
    });
  }

  async listFunds(accessToken: string, accountId: string): Promise<BrokerCash[]> {
    const data = asRecord(
      await this.get(`/api/v1.0/accounts/${encodeURIComponent(accountId)}/funds?currency=USD`, accessToken),
    );
    const rows = CASH_FIELDS.map(([currency, field]) => ({ currency, cash: asString(data[field]) })).filter((row) =>
      isCash(row.cash),
    );
    if (rows.length) return rows;
    const cash = asString(data.cash);
    if (!isCash(cash)) return [];
    return [{ currency: asString(data.currency) || "USD", cash }];
  }

  async listFills(input: ListFillsInput): Promise<FillPage> {
    const params = new URLSearchParams({
      trd_market: input.market,
      start: String(input.startAt || 0),
      end: String(input.endAt || 0),
      page_flag: input.pageFlag ?? "",
      page_size: "50",
    });
    const data = asRecord(
      await this.get(
        `/api/v1.0/accounts/${encodeURIComponent(input.accountId)}/fills_history?${params}`,
        input.accessToken,
      ),
    );
    const rows = Array.isArray(data.order_fills) ? data.order_fills : [];
    const fills = rows.map((item) => {
      const row = asRecord(item);
      const micros = Number(asString(row.create_time) || "0");
      return {
        dealId: asString(row.deal_id),
        side: asString(row.trd_side),
        code: asString(row.code),
        stockName: asString(row.stock_name),
        qty: asString(row.qty),
        price: asString(row.price),
        tradedAt: Number.isFinite(micros) ? Math.floor(micros / 1000) : Date.now(),
      };
    });
    const next = asString(data.page_flag);
    return { fills, nextPageFlag: data.completed === true || !next ? null : next };
  }

  private async tokenRequest(body: URLSearchParams): Promise<BrokerToken> {
    const response = await this.request(`${API}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = (await response.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
      error?: string;
      error_description?: string;
    };
    if (!response.ok || !json.access_token) {
      throw new Error(json.error_description || json.error || "futu_token_failed");
    }
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresIn: json.expires_in ?? 7200,
      accessExpiresAt: Date.now() + (json.expires_in ?? 7200) * 1000,
      scope: json.scope ?? SCOPE,
    };
  }

  private async get(path: string, accessToken: string) {
    const response = await this.request(`${API}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = (await response.json()) as Envelope;
    if (!response.ok || body.s === "error") {
      throw new Error(body.errmsg || "futu_request_failed");
    }
    return body.d;
  }

  private async request(url: string, init: RequestInit) {
    const response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(30_000) });
    const text = await response.text();
    return { ok: response.ok, status: response.status, json: () => Promise.resolve(parseJson(text)) };
  }
}

function parseJson(text: string) {
  return JSON.parse(text.replace(/:\s*(-?\d{16,})(?=\s*[,}\]])/g, ': "$1"')) as unknown;
}

function asRecord(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return String(value);
  return "";
}

function mapMarkets(values: number[]) {
  return [...new Set(values.map((value) => ENABLE_MARKET[value]).filter((item): item is string => Boolean(item)))];
}

function isCash(value: string) {
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) && n !== 0;
}

function maskCard(card: string) {
  if (!card) return "****";
  if (card.length <= 4) return card;
  return `****${card.slice(-4)}`;
}

export { FutuBrokerage };
