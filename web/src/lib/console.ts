export const brokers = [
  { id: "futu", name: { zh: "富途", en: "Futu" }, ready: true },
] as const;

export const userNav = [
  { id: "profile", href: "/user/profile", key: "nav_profile" as const, zh: "资料" },
  { id: "overview", href: "/user", key: "nav_overview" as const, zh: "概览" },
  { id: "broker", href: "/user/broker", key: "nav_broker" as const, zh: "券商" },
  { id: "holdings", href: "/user/holdings", key: "nav_holdings" as const, zh: "持仓" },
  { id: "records", href: "/user/activity", key: "nav_records" as const, zh: "记录" },
  { id: "share", href: "/user/share", key: "nav_share" as const, zh: "披露" },
  { id: "preview", href: "/user/preview", key: "nav_preview" as const, zh: "预览" },
];
