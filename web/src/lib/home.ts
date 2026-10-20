import { ApiError, getUserHome, getUser, type UserHome } from "./api";
import { applyLocale, readLocale } from "./i18n";
import { esc, marketPills, pill, sidePill, symbolCell, toneClass } from "./markup";
import { avatarHue, formatSubscribers } from "./publishers";

const HIDDEN = "**";

function dash(value: string | null | undefined) {
  return value && value.length ? value : "—";
}

function masked(value: string | null | undefined) {
  return value === HIDDEN;
}

function smudge() {
  return `<span class="gated" aria-hidden="true"></span>`;
}

function textCell(value: string | null | undefined) {
  if (masked(value)) return `<td>${smudge()}</td>`;
  return `<td>${esc(dash(value))}</td>`;
}

function numCell(value: string | null | undefined, extra = "") {
  if (masked(value)) return `<td class="num${extra}">${smudge()}</td>`;
  const tone = value?.startsWith("+") ? " up" : value?.startsWith("-") ? " down" : "";
  return `<td class="num${extra}${tone}">${esc(dash(value))}</td>`;
}

function holdingsFogRow() {
  return `<tr class="gated-row">
        <td>${smudge()}</td>
        <td>${smudge()}</td>
        ${numCell(HIDDEN)}
        ${numCell(HIDDEN, " hide-sm")}
        ${numCell(HIDDEN)}
        ${numCell(HIDDEN)}
      </tr>`;
}

function fillsFogRow() {
  return `<tr class="gated-row">
        ${textCell(HIDDEN)}
        <td>${smudge()}</td>
        <td>${smudge()}</td>
        <td>${smudge()}</td>
        ${textCell(HIDDEN)}
        ${numCell(HIDDEN)}
        ${numCell(HIDDEN, " hide-sm")}
        ${numCell(HIDDEN)}
      </tr>`;
}

function holdingsTable(rows: UserHome["holdings"]) {
  if (!rows.length) return `<p class="note" data-i18n="holdings_empty">暂无仓位。</p>`;
  const body = rows
    .map((row) => {
      if (masked(row.code)) return holdingsFogRow();
      return `<tr>
        <td>${symbolCell(row.code, row.name)}</td>
        <td>${row.side ? sidePill(row.side) : ""}</td>
        ${numCell(row.qty)}
        ${numCell(row.cost, " hide-sm")}
        ${numCell(row.value)}
        ${numCell(row.pl)}
      </tr>`;
    })
    .join("");
  return `<div class="well"><table class="holdings">
    <thead><tr>
      <th data-i18n="symbol">标的</th>
      <th data-i18n="side">方向</th>
      <th class="num" data-i18n="qty">数量</th>
      <th class="num hide-sm" data-i18n="cost">成本</th>
      <th class="num" data-i18n="value">市值</th>
      <th class="num" data-i18n="pnl">盈亏</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table></div>`;
}

function fillsTable(rows: UserHome["fills"]) {
  if (!rows.length) return `<p class="note" data-i18n="fills_empty">暂无成交。</p>`;
  const body = rows
    .map((row) => {
      if (masked(row.code)) return fillsFogRow();
      return `<tr>
        ${textCell(row.time)}
        <td>${symbolCell(row.code, row.name)}</td>
        <td>${pill("fill")}</td>
        <td>${row.side ? sidePill(row.side) : ""}</td>
        ${textCell(row.currency)}
        ${numCell(row.qty)}
        ${numCell(row.price, " hide-sm")}
        ${numCell(row.amount)}
      </tr>`;
    })
    .join("");
  return `<div class="well"><table class="holdings">
    <thead><tr>
      <th data-i18n="time">时间</th>
      <th data-i18n="symbol">标的</th>
      <th data-i18n="status">状态</th>
      <th data-i18n="side">方向</th>
      <th data-i18n="currency">货币</th>
      <th class="num" data-i18n="qty">数量</th>
      <th class="num hide-sm" data-i18n="fill_price">价格</th>
      <th class="num" data-i18n="notional">成交额</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table></div>`;
}

function renderHome(root: HTMLElement, data: UserHome, opts: { forceSubscribed: boolean; loggedIn: boolean }) {
  const subscribedChrome = opts.forceSubscribed || data.subscribed;
  const locked = data.access === "locked" && !opts.forceSubscribed;
  const ytdClass = toneClass(data.ytd);
  const letter = esc([...data.name][0] ?? "?");
  const meAttrs = data.me ? " data-me-avatar" : "";
  const meName = data.me ? " data-me-name" : "";
  const meBio = data.me ? " data-me-bio" : "";
  const subscribeHref = opts.loggedIn ? `/users/${esc(data.handle)}/sub` : "/login";
  const books = locked
    ? `<p class="lede" data-i18n="subs_only">这份主页仅订阅者可见。</p>`
    : `<h2 data-i18n="positions">仓位</h2>
       ${holdingsTable(data.holdings)}
       ${subscribedChrome ? `<p class="note" data-i18n="masked_only">账户号始终掩码。</p>` : ""}
       <h2 data-i18n="trades">交易记录</h2>
       ${fillsTable(data.fills)}`;
  const days = data.daysLeft;
  const aside = subscribedChrome
    ? `<h2 style="margin-top:0" data-i18n="subscribed">已订</h2>
       ${
         days != null
           ? `<p class="lede" data-i18n="sub_left" data-n="${String(days)}">剩余 ${days} 天。到期后需再订。</p>`
           : ""
       }
       <a class="btn ghost block" href="/app" data-i18n="manage_sub">管理订阅</a>`
    : `<h2 style="margin-top:0" data-i18n="subscribe">订阅</h2>
       <p class="lede" data-i18n="subscribe_price" data-price="${String(data.price)}">¥${data.price} / 30 天。到期后需再订。</p>
       <a class="btn block" href="${subscribeHref}" data-i18n="subscribe_30">订阅 30 天</a>`;

  root.innerHTML = `<div>
    <div class="identity">
      <span class="avatar" style="--h:${avatarHue(data.handle)}"${meAttrs}>${letter}</span>
      <div>
        <h1${meName}>${esc(data.name)}</h1>
        <div class="who"><span>@${esc(data.handle)}</span></div>
      </div>
    </div>
    <p class="lede" data-zh="${esc(data.bio.zh)}" data-en="${esc(data.bio.en)}"${meBio}>${esc(data.bio.zh)}</p>
    <div class="props">
      <div class="prop"><span data-i18n="ytd">今年收益</span><b class="${ytdClass}">${esc(data.ytd)}</b></div>
      <div class="prop"><span data-i18n="subscribers">订阅</span><b>${formatSubscribers(data.subscribers)}</b></div>
      <div class="prop"><span data-i18n="market">市场</span><b class="pills">${marketPills(data.markets)}</b></div>
    </div>
    ${books}
  </div>
  <aside><div class="panel">${aside}</div></aside>`;

  const heading = document.querySelector<HTMLElement>(".topbar h1");
  if (heading && !heading.dataset.i18n) {
    heading.textContent = data.name;
    if (data.me) heading.dataset.meName = "";
  }
  document.title = `${data.name} · Wire`;
  applyLocale(readLocale());
}

export async function mountUserHome() {
  const root = document.getElementById("user-home");
  if (!root) return;
  const forceSubscribed = root.dataset.subscribed === "1";
  const parts = location.pathname.split("/").filter(Boolean);
  let handle = parts[0] === "users" ? (parts[1] ?? "") : "";
  let loggedIn = false;
  try {
    const user = await getUser();
    loggedIn = true;
    if (!handle || handle === "_") handle = user.handle;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && parts[0] === "user") {
      location.replace("/login");
      return;
    }
  }
  if (!handle || handle === "_") {
    root.innerHTML = `<p class="note" data-i18n="publisher_missing">没有这个发布者</p>`;
    applyLocale(readLocale());
    return;
  }
  try {
    const data = await getUserHome(handle);
    renderHome(root, data, { forceSubscribed, loggedIn });
  } catch (error) {
    const missing = error instanceof ApiError && error.status === 404;
    root.innerHTML = `<p class="note" data-i18n="${missing ? "publisher_missing" : "error_failed"}">${
      missing ? "没有这个发布者" : "请求失败，请再试。"
    }</p>`;
    applyLocale(readLocale());
  }
}
