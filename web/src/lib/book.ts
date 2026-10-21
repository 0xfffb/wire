import { ApiError, apiGet, apiSend, type BookResponse, type CashRow, type ConnectView, type HoldingRow, type OrderRow, type Overview, type SyncRow } from "./api";
import { applyLocale, readLocale, t, type MessageKey } from "./i18n";
import { applyProfile } from "./profile";

function gated() {
  return `<span class="gated" aria-hidden="true"></span>`;
}

function ccyPill(ccy: string) {
  return `<span class="pill" data-tone="${ccy === "USD" ? "us" : "hk"}"><i class="pill-dot"></i>${ccy}</span>`;
}

function i18n(key: MessageKey) {
  return `<span data-i18n="${key}">${t("zh", key)}</span>`;
}

function emptyBox(key: MessageKey) {
  return `<p class="empty" data-i18n="${key}">${t("zh", key)}</p>`;
}

function text(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function syncNote(detail: string) {
  if (detail === "ok") return i18n("ok");
  if (detail === "reauth_needed") return i18n("reauth_needed");
  if (detail === "snaptrade_unconfigured") return i18n("error_snaptrade_unconfigured");
  if (detail === "snaptrade_unavailable") return i18n("error_snaptrade_unavailable");
  return text(detail);
}

function num(value: string | undefined, hide: boolean) {
  return hide || value == null ? gated() : value;
}

function pnlTone(value: string | null | undefined) {
  if (!value) return "";
  const signs = value.split(" · ").map((part) => (part.includes("+") ? 1 : part.includes("-") ? -1 : 0));
  if (signs.every((sign) => sign > 0)) return "up";
  if (signs.every((sign) => sign < 0)) return "down";
  return "";
}

export function cashTableHtml(rows: CashRow[]) {
  const visible = rows.filter((row) => Number(row.balance.replace(/,/g, "")) > 0);
  if (!visible.length) return emptyBox("no_cash");
  return `<table class="holdings"><thead><tr><th>${i18n("currency")}</th><th class="num">${i18n("balance")}</th><th class="num">${i18n("weight")}</th></tr></thead><tbody>${visible
    .map((row) => `<tr><td>${row.ccy}</td><td class="num">${row.balance}</td><td class="num">${row.weight}</td></tr>`)
    .join("")}</tbody></table>`;
}

export function holdingsTableHtml(rows: HoldingRow[], hideSize: boolean) {
  if (!rows.length) return emptyBox("no_holdings");
  return `<table class="holdings"><thead><tr><th>${i18n("holdings")}</th><th>${i18n("currency")}</th><th class="num">${i18n("price")}</th><th class="num">${i18n("qty")}</th><th class="num">${i18n("value")}</th><th class="num">${i18n("cost")}</th><th class="num">${i18n("pnl")}</th><th class="num">${i18n("weight")}</th></tr></thead><tbody>${rows
    .map(
      (row) =>
        `<tr><td><strong>${row.code}</strong> ${row.name}</td><td>${ccyPill(row.ccy)}</td><td class="num">${row.price}</td><td class="num">${num(row.qty, hideSize)}</td><td class="num">${num(row.value, hideSize)}</td><td class="num">${num(row.cost, hideSize)}</td><td class="num ${pnlTone(row.pnlPct ?? row.pnl)}"><span class="pnl">${num(row.pnl, hideSize)}<span class="pnl-pct">${row.pnlPct ?? "—"}</span></span></td><td class="num">${num(row.weight, hideSize)}</td></tr>`,
    )
    .join("")}</tbody></table>`;
}

export function ordersTableHtml(rows: OrderRow[], hideSize: boolean) {
  if (!rows.length) return emptyBox("no_orders");
  return `<table class="holdings"><thead><tr><th>${i18n("order")}</th><th>${i18n("side")}</th><th>${i18n("currency")}</th><th class="num">${i18n("price")}</th><th class="num">${i18n("qty")}</th><th class="num">${i18n("amount")}</th><th>${i18n("status")}</th><th>${i18n("time")}</th></tr></thead><tbody>${rows
    .map(
      (row) =>
        `<tr><td><strong>${row.code}</strong></td><td><span class="pill" data-tone="${row.side}"><i class="pill-dot"></i>${i18n(row.side)}</span></td><td>${ccyPill(row.ccy)}</td><td class="num">${row.price}</td><td class="num">${num(row.qty, hideSize)}</td><td class="num">${num(row.amount, hideSize)}</td><td><span class="pill" data-tone="ok"><i class="pill-dot"></i>${i18n(row.status === "filled" ? "filled" : "ok")}</span></td><td>${row.time}</td></tr>`,
    )
    .join("")}</tbody></table>`;
}

export async function paintPublic() {
  const book = await apiGet<BookResponse>("/api/book");
  applyProfile({
    name: book.profile.name,
    bio: book.profile.bio,
    avatar: book.profile.avatar ?? "",
    x: book.profile.x ?? "",
    site: book.profile.site ?? "",
    youtube: book.profile.youtube ?? "",
  });
  const snapshot = book.listed ? book.snapshot : null;
  const hideSize = book.showQty !== true;
  const ytd = document.querySelector("[data-public-ytd]");
  const lastOk = document.querySelector("[data-public-lastok]");
  if (ytd) {
    ytd.textContent = snapshot?.ytd ?? "—";
    ytd.classList.toggle("up", pnlTone(snapshot?.ytd) === "up");
    ytd.classList.toggle("down", pnlTone(snapshot?.ytd) === "down");
  }
  if (lastOk) lastOk.textContent = snapshot?.lastOk ?? "—";
  const cashBox = document.querySelector("[data-public-cash]");
  const holdingsBox = document.querySelector("[data-public-holdings]");
  const ordersBox = document.querySelector("[data-public-orders]");
  if (cashBox) cashBox.innerHTML = snapshot ? cashTableHtml(snapshot.cash) : emptyBox("no_cash");
  if (holdingsBox) holdingsBox.innerHTML = snapshot ? holdingsTableHtml(snapshot.holdings, hideSize) : emptyBox("no_holdings");
  if (ordersBox) ordersBox.innerHTML = snapshot ? ordersTableHtml(snapshot.orders ?? [], hideSize) : emptyBox("no_orders");
  document.querySelectorAll<HTMLElement>("[data-when-public]").forEach((el) => {
    el.hidden = !snapshot;
  });
  document.querySelectorAll<HTMLElement>("[data-when-private]").forEach((el) => {
    el.hidden = book.listed;
  });
  document.querySelectorAll<HTMLElement>("[data-when-nosync]").forEach((el) => {
    el.hidden = !(book.listed && !snapshot);
  });
  document.querySelectorAll<HTMLElement>("[data-when-fills]").forEach((el) => {
    el.hidden = !snapshot || book.showFills === false;
  });
  document.querySelectorAll<HTMLElement>("[data-live-tag]").forEach((el) => {
    el.hidden = !snapshot;
    el.dataset.tone = book.profile.paper ? "paper" : "live";
    const label = el.querySelector("[data-i18n]");
    if (label) label.setAttribute("data-i18n", book.profile.paper ? "paper" : "live");
  });
  applyLocale(readLocale());
}

export async function paintOverview(box: Element | null) {
  if (!box) return;
  const data = await apiGet<Overview>("/api/admin/overview");
  if (data.status === "disconnected") {
    const href = data.configured ? "/admin/connect" : "/admin/connect#keys";
    box.innerHTML = `<div class="props"><div class="prop">${i18n("status")}<b>${i18n("disconnected")}</b></div><div class="prop">${i18n("home")}<b>${i18n(data.listed ? "listed_on" : "listed_off")}</b></div></div>
      <p class="lede" data-i18n="connect_empty">${t("zh", "connect_empty")}</p>
      <a class="btn" href="${href}" data-i18n="go_connect">${t("zh", "go_connect")}</a>`;
    applyLocale(readLocale());
    return;
  }
  const status =
    data.status === "reauth"
      ? `<div class="prop">${i18n("status")}<b class="down">${i18n("needs_reauth")}</b></div>`
      : `<div class="prop">${i18n("status")}<b>${i18n("connected")}</b></div>`;
  const ytdClass = pnlTone(data.ytd);
  const feed = data.activity.length
    ? `<h2 data-i18n="activity">最近变动</h2><div class="well"><ul class="feed">${data.activity
        .map(
          (row) =>
            `<li><span class="feed-main"><span class="pill" data-tone="${row.side}"><i class="pill-dot"></i>${i18n(row.side)}</span>${row.code}</span><time>${row.time}</time></li>`,
        )
        .join("")}</ul></div>`
    : "";
  box.innerHTML = `<div class="props">${status}<div class="prop">${i18n("source")}<b>${data.source}</b></div><div class="prop">${i18n("ytd")}<b class="${ytdClass}">${data.ytd ?? "—"}</b></div><div class="prop">${i18n("home")}<b>${i18n(data.listed ? "listed_on" : "listed_off")}</b></div><div class="prop">${i18n("last_ok")}<b>${data.lastOk ?? "—"}</b></div></div>
    ${data.status === "reauth" ? `<p class="lede" data-i18n="reauth_note">${t("zh", "reauth_note")}</p>` : ""}
    ${feed}`;
  applyLocale(readLocale());
}

export async function paintAdminTables() {
  const holdingsBox = document.querySelector("[data-admin-holdings]");
  const ordersBox = document.querySelector("[data-admin-orders]");
  const syncBox = document.querySelector("[data-admin-sync]");
  if (holdingsBox) {
    const data = await apiGet<{ cash: CashRow[]; holdings: HoldingRow[] }>("/api/admin/holdings");
    holdingsBox.innerHTML = `${data.cash.length ? `<h2 data-i18n="cash">${t("zh", "cash")}</h2>${cashTableHtml(data.cash)}` : ""}${holdingsTableHtml(data.holdings, false)}`;
  }
  if (ordersBox) {
    const data = await apiGet<{ orders: OrderRow[] }>("/api/admin/orders");
    ordersBox.innerHTML = ordersTableHtml(data.orders, false);
  }
  if (syncBox) {
    const data = await apiGet<{ syncs: SyncRow[] }>("/api/admin/syncs");
    syncBox.innerHTML = data.syncs.length
      ? `<table class="holdings"><thead><tr><th>${i18n("time")}</th><th>${i18n("result")}</th><th>${i18n("detail")}</th></tr></thead><tbody>${data.syncs
          .map(
            (row) =>
              `<tr><td>${row.time}</td><td><span class="pill" data-tone="${row.ok ? "ok" : "error"}"><i class="pill-dot"></i>${i18n(row.ok ? "ok" : "fail")}</span></td><td>${syncNote(row.detail)}</td></tr>`,
          )
          .join("")}</tbody></table>`
      : emptyBox("no_sync");
  }
  applyLocale(readLocale());
}

const SECRET_MASK = "************";

let connectConfigured = false;

function secretInput() {
  return document.getElementById("snaptrade-secret") as HTMLInputElement | null;
}

function isSecretMask(value: string) {
  return value.length > 0 && /^\*+$/.test(value);
}

function paintSecret(configured: boolean) {
  const secret = secretInput();
  if (!secret || document.activeElement === secret) return;
  secret.required = !configured;
  if (configured) {
    secret.type = "text";
    secret.value = SECRET_MASK;
  } else {
    secret.type = "password";
    secret.value = "";
  }
}

export function showConnectView() {
  const view = location.hash === "#keys" ? "keys" : "link";
  document.querySelectorAll<HTMLElement>("[data-connect-view]").forEach((el) => {
    el.hidden = el.dataset.connectView !== view;
  });
}

export async function paintConnect() {
  const data = await apiGet<ConnectView>("/api/admin/connect");
  connectConfigured = data.configured;
  document.querySelectorAll<HTMLElement>("[data-conn-panel]").forEach((el) => {
    el.hidden = el.dataset.connPanel !== data.status;
  });
  const lastOk = data.lastOk ?? "—";
  document.querySelectorAll("[data-connect-lastok]").forEach((el) => {
    el.textContent = lastOk;
  });
  document.querySelectorAll("[data-keys-status]").forEach((el) => {
    el.setAttribute("data-i18n", data.configured ? "snaptrade_configured" : "snaptrade_unconfigured");
  });
  const list = document.querySelector("[data-account-list]");
  if (list) {
    list.innerHTML = data.accounts
      .map(
        (row) => `<label class="account-row">
          <input type="radio" name="acc" value="${row.id}" ${row.included ? "checked" : ""} />
          <span class="grow">${row.mask}</span>
          <span class="pill" data-tone="${row.paper ? "paper" : "live"}"><i class="pill-dot"></i>${i18n(row.paper ? "paper" : "live")}</span>
          <span class="pill"><i class="pill-dot"></i>${row.brokerage}</span>
        </label>`,
      )
      .join("");
  }
  const client = document.getElementById("snaptrade-client") as HTMLInputElement | null;
  if (client && document.activeElement !== client) client.value = data.clientId;
  paintSecret(data.configured);
  const secret = secretInput();
  if (secret && !secret.dataset.maskBound) {
    secret.dataset.maskBound = "1";
    secret.addEventListener("focus", () => {
      if (isSecretMask(secret.value)) {
        secret.value = "";
        secret.type = "password";
      }
    });
    secret.addEventListener("blur", () => {
      if (!secret.value.trim() && connectConfigured) paintSecret(true);
    });
  }
  showConnectView();
  applyLocale(readLocale());
  return data;
}

function showConnectError(error: unknown) {
  const code = error instanceof ApiError ? error.code : "failed";
  const key = code === "snaptrade_unconfigured" ? "error_snaptrade_unconfigured" : code === "snaptrade_unavailable" ? "error_snaptrade_unavailable" : "error_failed";
  const text = error instanceof ApiError && error.detail ? error.detail : t(readLocale(), key);
  document.querySelectorAll<HTMLElement>("[data-connect-error]").forEach((el) => {
    el.hidden = false;
    el.textContent = text;
  });
}

export async function saveKeys() {
  const client = document.getElementById("snaptrade-client") as HTMLInputElement | null;
  const secret = document.getElementById("snaptrade-secret") as HTMLInputElement | null;
  const saved = document.querySelector<HTMLElement>("[data-keys-saved]");
  const errorBox = document.querySelector<HTMLElement>("[data-keys-error]");
  if (saved) saved.hidden = true;
  if (errorBox) errorBox.hidden = true;
  const clientId = client?.value.trim() ?? "";
  const typed = secret?.value.trim() ?? "";
  const consumerKey = typed && !isSecretMask(typed) ? typed : "";
  if (!clientId || (!consumerKey && !connectConfigured)) {
    if (errorBox) {
      errorBox.hidden = false;
      errorBox.textContent = t(readLocale(), "error_snaptrade_unconfigured");
    }
    return;
  }
  try {
    await apiSend("/api/admin/connect/keys", "PUT", {
      clientId,
      ...(consumerKey ? { consumerKey } : {}),
    });
    await paintConnect();
    if (saved) saved.hidden = false;
    applyLocale(readLocale());
  } catch (error) {
    if (errorBox) {
      errorBox.hidden = false;
      errorBox.textContent = t(readLocale(), error instanceof ApiError && error.code === "snaptrade_unconfigured" ? "error_snaptrade_unconfigured" : "error_failed");
    }
  }
}

export async function startConnect() {
  document.querySelectorAll<HTMLElement>("[data-connect-error]").forEach((el) => {
    el.hidden = true;
  });
  if (!connectConfigured) {
    location.hash = "keys";
    return;
  }
  try {
    const { url } = await apiSend<{ url: string }>("/api/admin/connect", "POST");
    location.href = url;
  } catch (error) {
    if (error instanceof ApiError && error.code === "snaptrade_unconfigured") {
      location.hash = "keys";
      return;
    }
    showConnectError(error);
  }
}

export async function saveAccount() {
  const selected = document.querySelector<HTMLInputElement>('input[name="acc"]:checked');
  if (!selected?.value) return;
  await apiSend("/api/admin/connect/account", "PUT", { accountId: selected.value });
  await paintConnect();
}

export async function disconnectBroker() {
  await apiSend("/api/admin/connect", "DELETE");
  await paintConnect();
}
