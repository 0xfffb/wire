import { ApiError, apiSend, forgetUser, getUser } from "./api";
import { applyProfile, applyUser } from "./profile";

export type Locale = "zh" | "en";
export type Theme = "dark" | "light";
export type ThemePref = "system" | Theme;

export const THEME_KEY = "wire.theme";
export const LOCALE_KEY = "wire.locale";

export const locales: { id: Locale; label: string; htmlLang: string }[] = [
  { id: "zh", label: "中文", htmlLang: "zh-CN" },
  { id: "en", label: "English", htmlLang: "en" },
];

export function isLocale(value: string | null | undefined): value is Locale {
  return locales.some((item) => item.id === value);
}

export function isThemePref(value: string | null | undefined): value is ThemePref {
  return value === "system" || value === "light" || value === "dark";
}

const zh = {
  title_home: "仓位 · Wire",
  title_login: "登录 · Wire",
  title_setup: "设置管理员 · Wire",
  title_overview: "概览 · Wire",
  title_connect: "连接 · Wire",
  title_holdings: "持仓 · Wire",
  title_records: "记录 · Wire",
  title_sync: "同步 · Wire",
  title_public: "公开 · Wire",
  title_profile: "资料 · Wire",
  title_terms: "服务条款 · Wire",
  title_privacy: "隐私政策 · Wire",
  nav_positions: "仓位",
  nav_console: "操作台",
  nav_overview: "概览",
  nav_connect: "连接",
  nav_holdings: "持仓",
  nav_records: "记录",
  nav_sync: "同步",
  nav_public: "公开",
  nav_profile: "资料",
  public_page: "公开页",
  login: "登录",
  logout: "退出",
  setup: "设置管理员",
  create: "创建",
  email: "邮箱",
  password: "密码",
  confirm_password: "确认密码",
  role_admin: "管理员",
  ytd: "当前收益",
  last_sync: "同步",
  last_ok: "上次成功",
  cash: "现金",
  holdings: "持仓",
  recent_orders: "最近订单",
  currency: "货币",
  balance: "余额",
  weight: "占比",
  price: "股价",
  qty: "数量",
  value: "市值",
  cost: "成本",
  pnl: "盈亏",
  order: "订单",
  side: "方向",
  amount: "金额",
  status: "状态",
  time: "时间",
  buy: "买入",
  sell: "卖出",
  filled: "已成",
  ok: "成功",
  fail: "失败",
  source: "来源",
  home: "主页",
  listed_on: "公开",
  listed_off: "未公开",
  connected: "已连接",
  disconnected: "未连接",
  needs_reauth: "需要重新授权",
  reauth_note: "授权失效。公开页仍展示上次成功同步的快照。",
  connect_empty: "还没有连接 SnapTrade。连上并完成一次成功同步后，公开页才会有仓。",
  go_connect: "去连接",
  activity: "最近变动",
  snaptrade: "SnapTrade",
  snaptrade_config: "配置",
  snaptrade_configured: "已配置",
  snaptrade_unconfigured: "未配置",
  snaptrade_keys_hint: "保存 SnapTrade 个人密钥（Client ID 和 Consumer Key），再连接券商。",
  snaptrade_client_id: "Client ID",
  snaptrade_consumer_key: "Consumer Key",
  back: "返回",
  include_accounts: "纳入账户",
  confirm_account: "确认纳入",
  connect: "连接",
  disconnect: "断开",
  reauth: "重新连接",
  live: "实盘",
  paper: "模拟盘",
  broker_schwab: "嘉信",
  broker_schwab_ira: "嘉信 IRA",
  no_cash: "没有现金。",
  no_holdings: "还没有持仓。",
  no_orders: "还没有订单。",
  no_sync: "还没有同步记录。",
  private_book: "仓位未公开。",
  no_snapshot: "还没有同步。",
  display_name: "显示名",
  bio_label: "简介",
  socials: "社媒",
  save: "保存",
  profile_saved: "已保存。",
  share_listed: "公开仓位",
  share_listed_hint: "关闭后首页只留名字和简介。",
  share_qty: "显示数量",
  share_qty_hint: "关闭则数量、市值、金额、成本、盈亏金额、占比为模糊。现金、股价、当前收益和单行盈亏百分比始终显示。",
  share_fills: "显示订单",
  share_fills_hint: "关闭后公开页不出现最近订单。",
  share_link: "公开链接",
  view_public: "查看公开页",
  result: "结果",
  detail: "说明",
  reauth_needed: "需要重新授权",
  social_x: "X",
  social_web: "网站",
  social_yt: "YouTube",
  terms: "条款",
  privacy: "隐私",
  terms_h1: "服务条款",
  privacy_h1: "隐私政策",
  legal_body: "占位内容。",
  theme_system: "跟随系统",
  theme_light: "浅色",
  theme_dark: "深色",
  error_invalid_body: "请检查填写内容。",
  error_email_taken: "这个邮箱已注册。",
  error_handle_taken: "这个用户名已被占用。",
  error_invalid_credentials: "邮箱或密码不对。",
  error_password_mismatch: "两次密码不一致。",
  error_unauthorized: "请先登录。",
  error_failed: "请求失败，请再试。",
  error_admin_exists: "已经有管理员了。",
  error_no_admin: "还没有管理员。",
  error_snaptrade_unavailable: "SnapTrade 暂时不可用。",
  error_snaptrade_unconfigured: "先保存 Client ID 和 Consumer Key。",
  error_reauth: "需要重新授权。",
};

const en: typeof zh = {
  title_home: "Holdings · Wire",
  title_login: "Log in · Wire",
  title_setup: "Set up admin · Wire",
  title_overview: "Overview · Wire",
  title_connect: "Connect · Wire",
  title_holdings: "Holdings · Wire",
  title_records: "Orders · Wire",
  title_sync: "Sync · Wire",
  title_public: "Sharing · Wire",
  title_profile: "Profile · Wire",
  title_terms: "Terms · Wire",
  title_privacy: "Privacy · Wire",
  nav_positions: "Holdings",
  nav_console: "Console",
  nav_overview: "Overview",
  nav_connect: "Connect",
  nav_holdings: "Holdings",
  nav_records: "Orders",
  nav_sync: "Sync",
  nav_public: "Sharing",
  nav_profile: "Profile",
  public_page: "Public page",
  login: "Log in",
  logout: "Log out",
  setup: "Set up admin",
  create: "Create",
  email: "Email",
  password: "Password",
  confirm_password: "Confirm password",
  role_admin: "Admin",
  ytd: "Return",
  last_sync: "Synced",
  last_ok: "Last success",
  cash: "Cash",
  holdings: "Holdings",
  recent_orders: "Recent orders",
  currency: "Ccy",
  balance: "Balance",
  weight: "Weight",
  price: "Price",
  qty: "Qty",
  value: "Value",
  cost: "Cost",
  pnl: "P&L",
  order: "Order",
  side: "Side",
  amount: "Amount",
  status: "Status",
  time: "Time",
  buy: "Buy",
  sell: "Sell",
  filled: "Filled",
  ok: "OK",
  fail: "Failed",
  source: "Source",
  home: "Page",
  listed_on: "Public",
  listed_off: "Private",
  connected: "Connected",
  disconnected: "Not connected",
  needs_reauth: "Needs re-auth",
  reauth_note: "Authorization expired. The public page still shows the last successful snapshot.",
  connect_empty: "SnapTrade is not connected. Connect and finish one successful sync before the public page can show a book.",
  go_connect: "Connect",
  activity: "Activity",
  snaptrade: "SnapTrade",
  snaptrade_config: "Configure",
  snaptrade_configured: "Configured",
  snaptrade_unconfigured: "Not configured",
  snaptrade_keys_hint: "Save your SnapTrade personal Client ID and Consumer Key, then connect a brokerage.",
  snaptrade_client_id: "Client ID",
  snaptrade_consumer_key: "Consumer Key",
  back: "Back",
  include_accounts: "Included account",
  confirm_account: "Save account",
  connect: "Connect",
  disconnect: "Disconnect",
  reauth: "Reconnect",
  live: "Live",
  paper: "Paper",
  broker_schwab: "Schwab",
  broker_schwab_ira: "Schwab IRA",
  no_cash: "No cash.",
  no_holdings: "No holdings yet.",
  no_orders: "No orders yet.",
  no_sync: "No sync history yet.",
  private_book: "Holdings are private.",
  no_snapshot: "Nothing synced yet.",
  display_name: "Display name",
  bio_label: "Bio",
  socials: "Social",
  save: "Save",
  profile_saved: "Saved.",
  share_listed: "Public holdings",
  share_listed_hint: "Off: the home page keeps name and bio only.",
  share_qty: "Show size",
  share_qty_hint: "Off: qty, value, amount, cost, P&L amount, and weight blur. Cash, price, current return, and per-holding P&L percent stay visible.",
  share_fills: "Show orders",
  share_fills_hint: "Off: recent orders are hidden on the public page.",
  share_link: "Public link",
  view_public: "View public page",
  result: "Result",
  detail: "Note",
  reauth_needed: "Needs re-auth",
  social_x: "X",
  social_web: "Website",
  social_yt: "YouTube",
  terms: "Terms",
  privacy: "Privacy",
  terms_h1: "Terms",
  privacy_h1: "Privacy",
  legal_body: "Placeholder.",
  theme_system: "System",
  theme_light: "Light",
  theme_dark: "Dark",
  error_invalid_body: "Check the form and try again.",
  error_email_taken: "This email is already registered.",
  error_handle_taken: "This username is taken.",
  error_invalid_credentials: "Email or password is wrong.",
  error_password_mismatch: "Passwords do not match.",
  error_unauthorized: "Sign in first.",
  error_failed: "Request failed. Try again.",
  error_admin_exists: "Admin already exists.",
  error_no_admin: "No admin yet.",
  error_snaptrade_unavailable: "SnapTrade is unavailable.",
  error_snaptrade_unconfigured: "Save Client ID and Consumer Key first.",
  error_reauth: "Needs re-auth.",
};

export const messages = { zh, en };
export type MessageKey = keyof typeof zh;

export const themePrefs: { id: ThemePref; labelKey: MessageKey }[] = [
  { id: "system", labelKey: "theme_system" },
  { id: "light", labelKey: "theme_light" },
  { id: "dark", labelKey: "theme_dark" },
];

export function t(locale: Locale, key: MessageKey, vars?: Record<string, string>) {
  let text: string = messages[locale][key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, value);
    }
  }
  return text;
}

export function readLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* ignore */
  }
  return "zh";
}

export function systemTheme(): Theme {
  try {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function readThemePref(): ThemePref {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (isThemePref(stored)) return stored;
  } catch {
    /* ignore */
  }
  return "system";
}

export function resolveTheme(pref: ThemePref): Theme {
  return pref === "system" ? systemTheme() : pref;
}

export function applyThemePref(pref: ThemePref) {
  const theme = resolveTheme(pref);
  document.documentElement.setAttribute("data-theme-pref", pref);
  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", theme === "light" ? "#f7f8f8" : "#08090a");
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {
    /* ignore */
  }
  for (const el of document.querySelectorAll<HTMLElement>("[data-theme-option]")) {
    const on = el.dataset.themeOption === pref;
    el.classList.toggle("is-on", on);
    el.setAttribute("aria-checked", on ? "true" : "false");
  }
}

export function applyLocale(locale: Locale) {
  const root = document.documentElement;
  root.setAttribute("data-locale", locale);
  root.lang = locales.find((item) => item.id === locale)?.htmlLang ?? "zh-CN";
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    /* ignore */
  }

  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const key = el.dataset.i18n as MessageKey | undefined;
    if (!key || !(key in messages.zh)) continue;
    const vars: Record<string, string> = {};
    for (const [name, value] of Object.entries(el.dataset)) {
      if (name === "i18n" || name === "i18nAttr" || !value) continue;
      vars[name] = value;
    }
    const text = t(locale, key, vars);
    const attr = el.dataset.i18nAttr;
    if (attr) {
      el.setAttribute(attr, text);
      if (attr === "aria-label") el.setAttribute("title", text);
    } else el.textContent = text;
  }

  for (const el of document.querySelectorAll<HTMLElement>("[data-zh][data-en]")) {
    el.textContent = locale === "en" ? el.dataset.en ?? "" : el.dataset.zh ?? "";
  }

  const titleKey = root.dataset.titleKey as MessageKey | undefined;
  if (titleKey && titleKey in messages.zh) document.title = t(locale, titleKey);

  for (const el of document.querySelectorAll<HTMLSelectElement>("[data-locale-select]")) {
    el.value = locale;
  }

  applyProfile();
}

export function bootUi() {
  applyThemePref(readThemePref());
  applyLocale(readLocale());

  document.querySelectorAll<HTMLElement>("[data-theme-option]").forEach((el) => {
    el.addEventListener("click", () => {
      const pref = el.dataset.themeOption;
      if (isThemePref(pref)) applyThemePref(pref);
    });
  });
  document.querySelectorAll<HTMLSelectElement>("[data-locale-select]").forEach((el) => {
    el.addEventListener("change", () => {
      if (isLocale(el.value)) applyLocale(el.value);
    });
  });

  try {
    window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
      if (readThemePref() === "system") applyThemePref("system");
    });
  } catch {
    /* ignore */
  }

  document.querySelectorAll<HTMLAnchorElement>(".side-logout").forEach((el) => {
    el.addEventListener("click", (event) => {
      event.preventDefault();
      void apiSend("/api/auth/logout", "POST")
        .catch(() => undefined)
        .then(() => {
          forgetUser();
          location.href = "/";
        });
    });
  });

  void getUser()
    .then((user) => applyUser(user))
    .catch((error) => {
      if (!(error instanceof ApiError && error.status === 401)) return;
      document.documentElement.setAttribute("data-auth", "out");
    });
}
