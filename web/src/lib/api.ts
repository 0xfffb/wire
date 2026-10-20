/** 同源 API 封装；生产与 Workers Assets 同域。 */
const API_BASE = import.meta.env.PUBLIC_API_BASE ?? "";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`api ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getHealth() {
  return apiGet<{ ok: boolean }>("/api/health");
}
