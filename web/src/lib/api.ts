const API_BASE = import.meta.env.PUBLIC_API_BASE ?? "";

export type Me = {
  id: string;
  email: string;
  name: string;
  bio: string;
  avatar: string | null;
  x: string | null;
  site: string | null;
  youtube: string | null;
};

export type Profile = Omit<Me, "id" | "email"> & { paper?: boolean };

export type ShareState = {
  listed: boolean;
  showQty: boolean;
  showFills: boolean;
};

export type CashRow = { ccy: string; balance: string; weight: string };
export type HoldingRow = {
  code: string;
  name: string;
  ccy: string;
  price: string;
  qty?: string;
  value?: string;
  cost?: string;
  pnl?: string;
  pnlPct?: string;
  weight?: string;
};
export type OrderRow = {
  code: string;
  side: "buy" | "sell";
  ccy: string;
  price: string;
  qty?: string;
  amount?: string;
  status: string;
  time: string;
};

export type BookResponse = {
  listed: boolean;
  showQty?: boolean;
  showFills?: boolean;
  profile: Profile;
  snapshot?: {
    lastOk: string;
    ytd: string | null;
    cash: CashRow[];
    holdings: HoldingRow[];
    orders?: OrderRow[];
  } | null;
};

export type Overview = {
  status: "disconnected" | "connected" | "reauth";
  source: string;
  listed: boolean;
  configured: boolean;
  ytd: string | null;
  lastOk: string | null;
  activity: { side: "buy" | "sell"; code: string; time: string }[];
};

export type ConnectAccount = {
  id: string;
  mask: string;
  brokerage: string;
  paper: boolean;
  included: boolean;
};

export type ConnectView = {
  status: Overview["status"];
  configured: boolean;
  clientId: string;
  lastOk: string | null;
  accounts: ConnectAccount[];
};

export type SyncRow = { time: string; ok: boolean; detail: string };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly detail?: string,
  ) {
    super(detail || code);
    this.name = "ApiError";
  }
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include", ...init, headers, cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as { error?: string; detail?: string } & T;
  if (!res.ok) {
    throw new ApiError(res.status, typeof data.error === "string" ? data.error : "failed", typeof data.detail === "string" ? data.detail : undefined);
  }
  return data;
}

export function apiGet<T>(path: string) {
  return apiJson<T>(path);
}

export function apiSend<T>(path: string, method: string, body?: unknown) {
  return apiJson<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

let meRequest: Promise<Me> | undefined;

export function getMe() {
  if (!meRequest) {
    meRequest = apiGet<Me>("/api/me").catch((error) => {
      meRequest = undefined;
      throw error;
    });
  }
  return meRequest;
}

export function forgetMe() {
  meRequest = undefined;
}

/** @deprecated */
export const getUser = getMe;
export const forgetUser = forgetMe;
export type CurrentUser = Me;
