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
  title_discover: "发现 · Wire",
  title_subs: "我的订阅 · Wire",
  title_login: "登录 · Wire",
  title_register: "注册 · Wire",
  title_terms: "服务条款 · Wire",
  title_privacy: "隐私政策 · Wire",
  title_overview: "概览 · Wire",
  title_broker: "券商 · Wire",
  title_holdings: "持仓 · Wire",
  title_records: "记录 · Wire",
  title_share: "披露 · Wire",
  title_preview: "预览 · Wire",
  title_profile: "资料 · Wire",
  title_apply: "申请发布 · Wire",
  discover: "发现",
  subscriptions: "我的订阅",
  publish: "发布",
  nav_overview: "概览",
  nav_broker: "券商",
  nav_holdings: "持仓",
  nav_records: "记录",
  nav_share: "披露",
  nav_preview: "预览",
  nav_profile: "资料",
  nav_apply: "申请发布",
  login: "登录",
  logout: "退出",
  register: "注册",
  terms: "条款",
  privacy: "隐私",
  search_publishers: "搜索发布者",
  all: "全部",
  market_us: "美股",
  market_hk: "港股",
  become_publisher: "成为发布者",
  apply_lede: "发布前需要申请。通过后才能连接券商、同步仓位。",
  apply_note: "策略说明",
  apply_note_ph: "交易风格、市场，一两句话即可。",
  apply_submit: "提交申请",
  apply_need_market: "至少选一个市场。",
  apply_pending_lede: "申请审核中。通过后会出现券商、持仓和披露。",
  apply_pass: "通过审核",
  apply_ok_lede: "申请已通过，可以连接券商并披露仓位。",
  apply_go: "去概览",
  ytd: "今年收益",
  subscribers: "订阅",
  sync: "同步",
  market: "市场",
  positions: "仓位",
  symbol: "标的",
  status: "状态",
  side: "方向",
  weight: "占比",
  pnl: "盈亏",
  long: "买入",
  short: "卖出",
  buy: "买入",
  sell: "卖出",
  flat: "—",
  gated: "未订阅最多看 3 条仓位，数字为 **，并补齐到 6 条。",
  holdings_empty: "暂无仓位。",
  masked_only: "账户号始终掩码。",
  subscribe: "订阅",
  subscribe_price: "¥{price} / 30 天。到期后需再订。",
  subscribe_30: "订阅 30 天",
  subscribe_includes: "开通后可见方向、数量、市值和盈亏。",
  sub_left: "剩余 {n} 天。到期后需再订。",
  manage_sub: "管理订阅",
  activity: "最近变动",
  trades: "交易记录",
  time: "时间",
  currency: "货币",
  fill_tag: "成交",
  fill_price: "价格",
  notional: "成交额",
  fills_empty: "暂无成交。",
  fills_hidden: "发布者未公开成交记录。",
  masked: "。账户号始终掩码。",
  remaining: "@{handle} · 剩余 18 天",
  days_left: "剩余 {n} 天",
  no_matches: "没有匹配的发布者",
  publisher_missing: "没有这个发布者",
  display_name: "显示名",
  bio_label: "简介",
  change_avatar: "更换头像",
  save_profile: "保存",
  profile_saved: "已保存，主页会用这份资料。",
  subs_only: "这份主页仅订阅者可见。",
  subscribed: "已订",
  publish_lede: "连接券商只读授权后，才能把账户同步到平台。",
  connection: "连接",
  unauthorized: "未授权",
  last_sync: "上次同步",
  accounts: "纳入账户",
  connect: "去连接",
  connected: "已连接",
  sync_now: "同步",
  broker_futu: "富途",
  broker: "券商",
  one_broker: "可以接入多家券商，同时只能连接一家。",
  disconnect: "断开",
  disconnected: "未连接",
  switch_broker: "断开当前券商后才能连接另一家。",
  scope_read: "只申请只读交易权限，不会下单。",
  reauth: "重新授权",
  confirm_accounts: "确认纳入",
  qty: "数量",
  cost: "成本",
  value: "市值",
  account: "账户",
  symbols: "标的数",
  today_events: "今日变动",
  listed: "出现在发现",
  listed_hint: "关闭后不会出现在发现里，知道用户名仍可打开主页。",
  sub_price: "订阅金额",
  sub_price_hint: "每 30 天，1–999 元。已有订阅不受影响。",
  preview_banner: "这是订阅者将看到的主页。",
  console_note: "接口还没接，这里只定版式。",
  note_label: "备注",
  username: "用户名",
  email: "邮箱",
  password: "密码",
  confirm_password: "确认密码",
  continue: "继续",
  back_discover: "返回发现",
  no_account: "没有账号？",
  have_account: "已有账号？",
  error_invalid_body: "请检查填写内容。",
  error_email_taken: "这个邮箱已注册。",
  error_handle_taken: "这个用户名已被占用。",
  error_invalid_credentials: "邮箱或密码不对。",
  error_password_mismatch: "两次密码不一致。",
  error_unauthorized: "请先登录。",
  error_failed: "请求失败，请再试。",
  terms_h1: "服务条款",
  privacy_h1: "隐私政策",
  legal_body: "占位内容。",
  theme_system: "跟随系统",
  theme_light: "浅色",
  theme_dark: "深色",
};

const en: typeof zh = {
  title_discover: "Discover · Wire",
  title_subs: "Subscriptions · Wire",
  title_login: "Log in · Wire",
  title_register: "Sign up · Wire",
  title_terms: "Terms · Wire",
  title_privacy: "Privacy · Wire",
  title_overview: "Overview · Wire",
  title_broker: "Broker · Wire",
  title_holdings: "Holdings · Wire",
  title_records: "Activity · Wire",
  title_share: "Sharing · Wire",
  title_preview: "Preview · Wire",
  title_profile: "Profile · Wire",
  title_apply: "Apply to publish · Wire",
  discover: "Discover",
  subscriptions: "Subscriptions",
  publish: "Publish",
  nav_overview: "Overview",
  nav_broker: "Broker",
  nav_holdings: "Holdings",
  nav_records: "Activity",
  nav_share: "Sharing",
  nav_preview: "Preview",
  nav_profile: "Profile",
  nav_apply: "Apply",
  login: "Log in",
  logout: "Log out",
  register: "Sign up",
  terms: "Terms",
  privacy: "Privacy",
  search_publishers: "Search publishers",
  all: "All",
  market_us: "US",
  market_hk: "HK",
  become_publisher: "Become a publisher",
  apply_lede: "Publishing requires an application. After approval you can connect a broker and sync holdings.",
  apply_note: "Approach",
  apply_note_ph: "Style and markets, in a sentence or two.",
  apply_submit: "Submit application",
  apply_need_market: "Pick at least one market.",
  apply_pending_lede: "Application in review. Broker, holdings, and sharing unlock after approval.",
  apply_pass: "Approve",
  apply_ok_lede: "Approved. You can connect a broker and share holdings.",
  apply_go: "Go to overview",
  ytd: "YTD",
  subscribers: "Subs",
  sync: "Sync",
  market: "Markets",
  positions: "Holdings",
  symbol: "Symbol",
  status: "Status",
  side: "Side",
  weight: "Weight",
  pnl: "P&L",
  long: "Buy",
  short: "Sell",
  buy: "Buy",
  sell: "Sell",
  flat: "—",
  gated: "Unsubscribed views get up to 3 holdings, padded to 6, with ** blurred.",
  holdings_empty: "No holdings.",
  masked_only: "Account numbers stay masked.",
  subscribe: "Subscribe",
  subscribe_price: "¥{price} / 30 days. Renew when it expires.",
  subscribe_30: "Subscribe 30 days",
  subscribe_includes: "Side, size, value, and P&L unlock after you subscribe.",
  sub_left: "{n} days left. Renew when it expires.",
  manage_sub: "Manage subscription",
  activity: "Activity",
  trades: "Trades",
  time: "Time",
  currency: "Ccy",
  fill_tag: "Fill",
  fill_price: "Price",
  notional: "Amount",
  fills_empty: "No fills.",
  fills_hidden: "This publisher does not share fills.",
  masked: ". Account numbers stay masked.",
  remaining: "@{handle} · 18 days left",
  days_left: "{n} days left",
  no_matches: "No publishers match.",
  publisher_missing: "Publisher not found.",
  display_name: "Display name",
  bio_label: "Bio",
  change_avatar: "Change photo",
  save_profile: "Save",
  profile_saved: "Saved. Your public profile uses this.",
  subs_only: "This profile is for subscribers.",
  subscribed: "Active",
  publish_lede: "Connect a broker with read-only access to sync an account.",
  connection: "Connection",
  unauthorized: "Not linked",
  last_sync: "Last sync",
  accounts: "Accounts",
  connect: "Connect",
  connected: "Connected",
  sync_now: "Sync",
  broker_futu: "Futu",
  broker: "Broker",
  one_broker: "Multiple brokers are supported. Only one can be connected at a time.",
  disconnect: "Disconnect",
  disconnected: "Not connected",
  switch_broker: "Disconnect the current broker before linking another.",
  scope_read: "Read-only trading access. No orders.",
  reauth: "Re-authorize",
  confirm_accounts: "Save accounts",
  qty: "Qty",
  cost: "Cost",
  value: "Value",
  account: "Account",
  symbols: "Names",
  today_events: "Today",
  listed: "Show in Discover",
  listed_hint: "Off: hidden from Discover. Anyone with your username can still open your page.",
  sub_price: "Subscription price",
  sub_price_hint: "Every 30 days, ¥1–999. Current subscriptions stay as they are.",
  preview_banner: "This is the subscriber view.",
  console_note: "API is not wired; this is layout only.",
  note_label: "Note",
  username: "Username",
  email: "Email",
  password: "Password",
  confirm_password: "Confirm password",
  continue: "Continue",
  back_discover: "Back to Discover",
  no_account: "No account?",
  have_account: "Have an account?",
  error_invalid_body: "Check the form and try again.",
  error_email_taken: "This email is already registered.",
  error_handle_taken: "This username is taken.",
  error_invalid_credentials: "Email or password is wrong.",
  error_password_mismatch: "Passwords do not match.",
  error_unauthorized: "Sign in first.",
  error_failed: "Request failed. Try again.",
  terms_h1: "Terms",
  privacy_h1: "Privacy",
  legal_body: "Placeholder.",
  theme_system: "System",
  theme_light: "Light",
  theme_dark: "Dark",
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
          location.href = "/login";
        });
    });
  });

  void getUser()
    .then((user) => applyUser(user))
    .catch((error) => {
      if (!(error instanceof ApiError && error.status === 401)) return;
      document.documentElement.setAttribute("data-auth", "out");
      document.documentElement.setAttribute("data-publish", "none");
    });
}
