import type { Copy, Market } from "./publishers";

export function esc(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function copyText(copy: Copy, locale: string) {
  return locale === "en" ? copy.en : copy.zh;
}

export function pill(tone: "us" | "hk" | "buy" | "sell" | "fill") {
  const keys = {
    us: { key: "market_us", zh: "美股" },
    hk: { key: "market_hk", zh: "港股" },
    buy: { key: "buy", zh: "买入" },
    sell: { key: "sell", zh: "卖出" },
    fill: { key: "fill_tag", zh: "成交" },
  } as const;
  const item = keys[tone];
  return `<span class="pill" data-tone="${tone}"><i class="pill-dot" aria-hidden="true"></i><span data-i18n="${item.key}">${item.zh}</span></span>`;
}

export function marketPills(markets: Market[]) {
  return markets.map((market) => pill(market)).join("");
}

export function sidePill(side: "long" | "short" | "flat" | "buy" | "sell") {
  if (side === "long" || side === "buy") return pill("buy");
  if (side === "short" || side === "sell") return pill("sell");
  return `<span class="dash">—</span>`;
}

export function symbolCell(code: string, name: Copy) {
  return `<strong>${esc(code)}.<span data-zh="${esc(name.zh)}" data-en="${esc(name.en)}">${esc(name.zh)}</span></strong>`;
}

export function toneClass(value: string | null | undefined) {
  if (value?.startsWith("+")) return "up";
  if (value?.startsWith("-")) return "down";
  return "";
}

export function numClass(value: string | null | undefined, extra = "") {
  const tone = toneClass(value);
  return `class="num${extra}${tone ? ` ${tone}` : ""}"`;
}
