/** 同源 API 封装；生产与 Workers Assets 同域。 */
const API_BASE = import.meta.env.PUBLIC_API_BASE ?? "";

export type PublishStatus = "none" | "pending" | "approved";

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

export function getUser() {
  return apiGet<CurrentUser>("/api/user");
}
