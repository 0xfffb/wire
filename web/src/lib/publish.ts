export const PUBLISH_KEY = "wire.publish";

export type PublishStatus = "none" | "pending" | "approved";
export type PublishState = {
  status: PublishStatus;
  markets: Array<"us" | "hk">;
  note: string;
};

export function defaultPublish(): PublishState {
  return { status: "none", markets: [], note: "" };
}

export function readPublish(): PublishState {
  const fallback = defaultPublish();
  try {
    const raw = localStorage.getItem(PUBLISH_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PublishState>;
    const status =
      parsed.status === "pending" || parsed.status === "approved" || parsed.status === "none"
        ? parsed.status
        : fallback.status;
    const markets = Array.isArray(parsed.markets)
      ? parsed.markets.filter((item): item is "us" | "hk" => item === "us" || item === "hk")
      : [];
    return { status, markets, note: parsed.note?.trim() ?? "" };
  } catch {
    return fallback;
  }
}

export function writePublish(state: PublishState) {
  try {
    localStorage.setItem(PUBLISH_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  document.documentElement.setAttribute("data-publish", state.status);
}
