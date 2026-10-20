import type { Copy, Market } from "./publishers";

export type ConsoleHolding = {
  code: string;
  name: Copy;
  side: "long" | "short" | "flat";
  qty: string;
  cost: string;
  value: string;
  pct: string;
  pl: string;
  account: string;
  market: Market | "cash";
};

export type ConsoleEvent = {
  time: Copy;
  text: Copy;
  note?: Copy;
  kind: "fill" | "note";
  side?: "buy" | "sell";
};

export const brokers = [
  { id: "futu", name: { zh: "富途", en: "Futu" }, ready: true },
  { id: "snaptrade", name: { zh: "SnapTrade", en: "SnapTrade" }, ready: true },
] as const;

export const consoleMe = {
  handle: "demo",
  name: "阿木",
  bio: { zh: "美股与港股混合账户。", en: "Mixed US and HK account." },
  connected: true,
  broker: "futu" as (typeof brokers)[number]["id"],
  ytd: "+16.2%",
  subscribers: 412,
  symbols: 6,
  todayEvents: 0,
  accounts: [
    { id: "US-**1823", market: "us" as const, on: true },
    { id: "HK-**4410", market: "hk" as const, on: true },
    { id: "US-**9901", market: "us" as const, on: false },
  ],
  holdings: [
    { code: "AAPL", name: { zh: "苹果", en: "Apple" }, side: "long" as const, qty: "120", cost: "178.20", value: "24,186", pct: "24.1%", pl: "+12.4%", account: "US-**1823", market: "us" as const },
    { code: "00700", name: { zh: "腾讯", en: "Tencent" }, side: "long" as const, qty: "400", cost: "312.40", value: "18,640", pct: "18.6%", pl: "-3.1%", account: "HK-**4410", market: "hk" as const },
    { code: "NVDA", name: { zh: "英伟达", en: "NVIDIA" }, side: "long" as const, qty: "36", cost: "94.10", value: "15,228", pct: "15.2%", pl: "+41.0%", account: "US-**1823", market: "us" as const },
    { code: "TSLA", name: { zh: "特斯拉", en: "Tesla" }, side: "short" as const, qty: "20", cost: "248.00", value: "5,412", pct: "5.4%", pl: "+2.1%", account: "US-**1823", market: "us" as const },
    { code: "MSFT", name: { zh: "微软", en: "Microsoft" }, side: "long" as const, qty: "18", cost: "378.00", value: "9,240", pct: "9.2%", pl: "+9.2%", account: "US-**1823", market: "us" as const },
    { code: "09988", name: { zh: "阿里巴巴", en: "Alibaba" }, side: "long" as const, qty: "220", cost: "82.40", value: "7,120", pct: "7.1%", pl: "+6.4%", account: "HK-**4410", market: "hk" as const },
    { code: "CASH", name: { zh: "现金 USD", en: "Cash USD" }, side: "flat" as const, qty: "—", cost: "—", value: "8,420", pct: "8.4%", pl: "—", account: "US-**1823", market: "cash" as const },
  ] satisfies ConsoleHolding[],
  events: [
    { kind: "fill" as const, side: "buy" as const, time: { zh: "周一", en: "Monday" }, text: { zh: "新建 00700 · 400 股", en: "Opened 00700 · 400 sh" }, note: { zh: "港股互联网", en: "HK internet" } },
    { kind: "fill" as const, side: "buy" as const, time: { zh: "上周五", en: "Fri" }, text: { zh: "加仓 NVDA · +8", en: "Added NVDA · +8" } },
    { kind: "fill" as const, side: "sell" as const, time: { zh: "9 月", en: "Sep" }, text: { zh: "减仓 TSLA · 20 股", en: "Reduced TSLA · 20 sh" } },
  ] satisfies ConsoleEvent[],
  policy: {
    audience: "public" as "public" | "subs",
  },
};

export const publisherNav = [
  { id: "profile", href: "/publisher/profile", key: "nav_profile" as const, zh: "资料" },
  { id: "overview", href: "/publisher", key: "nav_overview" as const, zh: "概览" },
  { id: "broker", href: "/publisher/broker", key: "nav_broker" as const, zh: "券商" },
  { id: "holdings", href: "/publisher/holdings", key: "nav_holdings" as const, zh: "持仓" },
  { id: "records", href: "/publisher/activity", key: "nav_records" as const, zh: "记录" },
  { id: "share", href: "/publisher/share", key: "nav_share" as const, zh: "披露" },
  { id: "preview", href: "/publisher/preview", key: "nav_preview" as const, zh: "预览" },
];
