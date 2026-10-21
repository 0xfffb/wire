import type { MessageKey } from "./i18n";

export const adminNav: { id: string; href: string; key: MessageKey; zh: string }[] = [
  { id: "overview", href: "/admin", key: "nav_overview", zh: "概览" },
  { id: "connect", href: "/admin/connect", key: "nav_connect", zh: "连接" },
  { id: "holdings", href: "/admin/holdings", key: "nav_holdings", zh: "持仓" },
  { id: "records", href: "/admin/activity", key: "nav_records", zh: "记录" },
  { id: "sync", href: "/admin/sync", key: "nav_sync", zh: "同步" },
  { id: "public", href: "/admin/public", key: "nav_public", zh: "公开" },
  { id: "profile", href: "/admin/profile", key: "nav_profile", zh: "资料" },
];
