import { createHash, randomBytes } from "node:crypto";
import { Broker, type BrokerAccount, type BrokerApp, type BrokerAuthorization, type BrokerFill, type BrokerFunds, type BrokerPosition, type BrokerToken, type FillPage } from "./broker";

const API = "https://webapi.futunn.com";

const ENABLE_MARKET_TO_TRD: Record<number, string> = {
  1: "HK",
  2: "US",
  4: "HKCC",
  5: "FUTURES",
  6: "SG",
  8: "AU",
  11: "MY",
  12: "CA",
  15: "JP",
  18: "KR",
};

type Envelope = { s?: string; errcode?: number; errmsg?: string; d?: unknown };

export class FutuBroker extends Broker {
  readonly id = "futu";

  async register(redirectUri: string): Promise<BrokerApp> {
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
    const json = (await response.json()) as { client_id?: string; registration_access_token?: string; error?: string };
    if (!response.ok || !json.client_id) {
      throw new Error(json.error || "向富途注册应用失败");
    }
    return { clientId: json.client_id, registrationAccessToken: json.registration_access_token ?? "" };
  }

  createAuthorization(clientId: string, redirectUri: string): BrokerAuthorization {
    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const state = randomBytes(16).toString("base64url");
    const params = new URLSearchParams({
      client_id: clientId,
      code_challenge: challenge,
      code_challenge_method: "S256",
      redirect_uri: redirectUri,
      response_type: "code",
      state,
      scope: "trade:read",
    });
    return { verifier, state, url: `${API}/oauth2/authorize/confirm?${params}` };
  }

  exchangeCode(code: string, verifier: string, clientId: string, redirectUri: string) {
    return this.tokenRequest(
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    );
  }

  refresh(refreshToken: string, clientId: string) {
    return this.tokenRequest(
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
      }),
    );
  }

  async listAccounts(accessToken: string): Promise<BrokerAccount[]> {
    const data = this.asRecord(await this.get("/api/v1.0/accounts/authorized_trd_accs", accessToken));
    const accounts = Array.isArray(data.accounts) ? data.accounts : [];
    return accounts.map((item) => {
      const account = this.asRecord(item);
      const markets = Array.isArray(account.enable_market)
        ? account.enable_market.filter((value): value is number => typeof value === "number")
        : [];
      return {
        accId: this.asString(account.account_id),
        cardMask: this.maskCard(this.asString(account.account_card_number)),
        markets: this.trdMarkets(markets),
      };
    });
  }

  async listFunds(accessToken: string, accId: string): Promise<BrokerFunds> {
    const data = this.asRecord(
      await this.get(`/api/v1.0/accounts/${encodeURIComponent(accId)}/funds?currency=HKD`, accessToken),
    );
    const named: Array<[string, string]> = [
      ["HKD", "hk_cash"],
      ["USD", "us_cash"],
      ["CNH", "cn_cash"],
      ["JPY", "jp_cash"],
      ["SGD", "sg_cash"],
      ["AUD", "au_cash"],
      ["MYR", "my_cash"],
      ["KRW", "kr_cash"],
    ];
    const balances = named
      .map(([currency, field]) => ({ currency, cash: this.asString(data[field]) }))
      .filter((item) => item.cash !== "" && item.cash !== "0" && item.cash !== "0.00");
    return {
      currency: this.asString(data.currency) || "HKD",
      cash: this.asString(data.cash),
      totalAssets: this.asString(data.total_assets),
      marketVal: this.asString(data.market_val),
      balances,
    };
  }

  async listPositions(accessToken: string, accId: string): Promise<BrokerPosition[]> {
    const data = await this.get(`/api/v1.0/accounts/${encodeURIComponent(accId)}/positions`, accessToken);
    const rows = Array.isArray(data) ? data : [];
    return rows.map((item) => {
      const row = this.asRecord(item);
      return {
        code: this.asString(row.code),
        stockName: this.asString(row.stock_name),
        side: this.asString(row.position_side) || "LONG",
        qty: this.asString(row.qty) || "0",
        costPrice: this.asString(row.cost_price),
        marketVal: this.asString(row.market_val) || "0",
        plRatio: this.asString(row.pl_ratio),
        plRatioValid: row.pl_ratio_valid === true,
        currency: this.asString(row.currency),
      };
    });
  }

  async listFills(accessToken: string, accId: string, market: string, pageFlag: string): Promise<FillPage> {
    const params = new URLSearchParams({ trd_market: market, page_flag: pageFlag, page_size: "50" });
    const data = this.asRecord(
      await this.get(`/api/v1.0/accounts/${encodeURIComponent(accId)}/fills_history?${params}`, accessToken),
    );
    const rows = Array.isArray(data.order_fills) ? data.order_fills : [];
    const fills = rows.map((item) => {
      const row = this.asRecord(item);
      const micros = Number(this.asString(row.create_time) || "0");
      return {
        dealId: this.asString(row.deal_id),
        side: this.asString(row.trd_side),
        code: this.asString(row.code),
        stockName: this.asString(row.stock_name),
        qty: this.asString(row.qty),
        price: this.asString(row.price),
        tradedAt: Number.isFinite(micros) ? Math.floor(micros / 1000) : Date.now(),
      } satisfies BrokerFill;
    });
    return { fills, pageFlag: this.asString(data.page_flag), completed: data.completed === true };
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
    if (!response.ok || !json.access_token || !json.refresh_token) {
      throw new Error(json.error_description || json.error || "换取富途 token 失败");
    }
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token,
      expiresIn: json.expires_in ?? 7200,
      scope: json.scope ?? "",
    };
  }

  private async get(path: string, accessToken: string) {
    const response = await this.request(`${API}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = (await response.json()) as Envelope;
    if (!response.ok || body.s === "error") {
      throw new Error(body.errmsg || `富途请求失败 ${response.status}`);
    }
    return body.d;
  }

  private parse(text: string) {
    return JSON.parse(text.replace(/:\s*(-?\d{16,})(?=\s*[,}\]])/g, ': "$1"')) as unknown;
  }

  private async request(url: string, init: RequestInit, attempts = 3) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30_000);
      try {
        const response = await fetch(url, { ...init, cache: "no-store", signal: controller.signal });
        const text = await response.text();
        return { ok: response.ok, status: response.status, json: () => Promise.resolve(this.parse(text)) };
      } catch (error) {
        lastError = error;
        if (attempt === attempts) break;
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      } finally {
        clearTimeout(timer);
      }
    }
    const cause = lastError instanceof Error ? lastError.message : "未知错误";
    throw new Error(`连接富途超时，请再点一次授权（${cause}）`);
  }

  private trdMarkets(values: number[]) {
    const markets = values.map((value) => ENABLE_MARKET_TO_TRD[value]).filter((market): market is string => Boolean(market));
    return [...new Set(markets)];
  }

  private maskCard(card: string) {
    if (card.length <= 4) return card;
    return `${"*".repeat(card.length - 4)}${card.slice(-4)}`;
  }

  private asRecord(value: unknown) {
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  }

  private asString(value: unknown) {
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "bigint") return String(value);
    return "";
  }
}
