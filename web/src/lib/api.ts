/** 同源 API 封装；生产与 Workers Assets 同域。 */
const API_BASE = import.meta.env.PUBLIC_API_BASE ?? "";

export type PublishStatus = "none" | "pending" | "approved";
export type Market = "us" | "hk";
export type Copy = { zh: string; en: string };
export type Access = "locked" | "preview" | "full" | "empty";

export type CurrentUser = {
  id: string;
  handle: string;
  email: string;
  name: string;
  bioZh: string;
  bioEn: string;
  publishStatus: PublishStatus;
  brokerConnected: boolean;
};

export type PublisherCard = {
  handle: string;
  name: string;
  bio: Copy;
  markets: Market[];
  ytd: string;
  subscribers: number;
  price: number;
  daysLeft?: number;
};

export type PublicHolding = {
  code: string;
  name: Copy;
  side: "long" | "short" | "flat" | null;
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
  side: "buy" | "sell" | null;
  qty: string | null;
  price: string | null;
  amount: string | null;
};

export type UserHome = PublisherCard & {
  access: Access;
  subscribed: boolean;
  daysLeft: number | null;
  me: boolean;
  holdings: PublicHolding[];
  fills: PublicFill[];
};

export type ConsoleHolding = {
  code: string;
  name: Copy;
  side: "long" | "short" | "flat";
  qty: string;
  cost: string;
  value: string;
  pl: string;
  account: string;
  market: Market | "cash";
};

export type ConsoleAccount = {
  id: string;
  mask: string;
  markets: Market[];
  included: boolean;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...init,
    headers,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new ApiError(res.status, typeof data.error === "string" ? data.error : "failed");
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

export function getHealth() {
  return apiGet<{ ok: boolean }>("/api/health");
}

let userRequest: Promise<CurrentUser> | undefined;

export function getUser() {
  if (!userRequest) {
    userRequest = apiGet<CurrentUser>("/api/user").catch((error) => {
      userRequest = undefined;
      throw error;
    });
  }
  return userRequest;
}

export function forgetUser() {
  userRequest = undefined;
}

export function getUsers() {
  return apiGet<{ users: PublisherCard[] }>("/api/users");
}

export function getUserHome(handle: string) {
  return apiGet<UserHome>(`/api/users/${encodeURIComponent(handle)}`);
}

export function getSubscriptions() {
  return apiGet<{ users: PublisherCard[] }>("/api/subscriptions");
}
