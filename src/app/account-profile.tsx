import { followAction, saveWebhookAction } from "./actions";
import { amountLabel, Percent } from "./percent";
import { ReturnChart } from "./return-chart";
import type { ReturnPoint } from "@/read/portfolio";
import { portfolio, type ActivityView, type PublicHolding } from "@/read/portfolio";

function when(value: number) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export function AccountProfile({
  publisherId,
  handle,
  displayName,
  bio,
  returnRate,
  curve,
  changeRate,
  subscribeAmount,
  expiresAt,
  syncedAt,
  subscribed,
  isOwner,
  loggedIn,
  holdings,
  activity,
  funds,
  hooks,
}: {
  publisherId: string;
  handle: string;
  displayName: string;
  bio: string;
  returnRate: string | null;
  curve: ReturnPoint[];
  changeRate: string | null;
  subscribeAmount: string;
  expiresAt: number | null;
  syncedAt: number | null;
  subscribed: boolean;
  isOwner: boolean;
  loggedIn: boolean;
  holdings: PublicHolding[];
  activity: ActivityView[];
  funds: Array<{ markets: string[]; cash: string; totalAssets: string; currency: string }>;
  hooks: Array<{ id: string; url: string }>;
}) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <section className="overflow-hidden rounded-2xl bg-black text-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-6 px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl font-semibold text-black">
              {displayName.slice(0, 1)}
            </div>
            <div>
              <p className="text-sm text-white/60">@{handle}</p>
              <h1 className="mt-1 text-4xl font-semibold tracking-tight">{displayName}</h1>
            </div>
          </div>
          <div className="text-right text-sm text-white/60">
            <div>{syncedAt ? `同步于 ${when(syncedAt)}` : "还没有持仓快照"}</div>
            <div className="mt-1">不构成投资建议</div>
          </div>
        </div>
        <p className="border-t border-white/10 px-8 py-5 text-sm leading-6 text-white/75">{bio || "还没有简介。"}</p>
        <div className="grid grid-cols-3 border-t border-white/10">
          <div className="px-8 py-5">
            <div className="text-xs text-white/50">涨跌幅</div>
            <div className="mt-2 text-3xl"><Percent value={changeRate} onDark /></div>
          </div>
          <div className="border-l border-white/10 px-8 py-5">
            <div className="text-xs text-white/50">收益率</div>
            <div className="mt-2 text-3xl"><Percent value={returnRate} onDark /></div>
          </div>
          <div className="border-l border-white/10 px-8 py-5">
            <div className="text-xs text-white/50">月费</div>
            <div className="num mt-2 text-3xl">{amountLabel(subscribeAmount)}</div>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-black/10 bg-white p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">收益率曲线</h2>
          <span className="text-xs text-[#666]">持仓成本收益率，按月合成 K 线</span>
        </div>
        <div className="mt-4">
          <ReturnChart points={curve} height={160} />
        </div>
      </section>

      {subscribed ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-black/10 bg-white p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold">仓位</h2>
                <span className="text-xs text-[#666]">{holdings.length} 个标的</span>
              </div>
              {funds.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {funds.map((item) => (
                    <div key={item.markets.join("-")} className="rounded-xl bg-[#fafafa] px-4 py-4">
                      <div className="text-xs text-[#666]">{item.markets.join(" / ") || "市场未知"}</div>
                      <div className="num mt-2 text-xl">{item.cash || "—"} <span className="text-sm text-[#666]">{item.currency}</span></div>
                      <div className="num mt-1 text-sm text-[#666]">净资产 {item.totalAssets || "—"} {item.currency}</div>
                    </div>
                  ))}
                </div>
              ) : null}
              {holdings.length === 0 ? (
                <p className="mt-4 text-sm text-[#666]">当前没有股票持仓。</p>
              ) : (
                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/10 text-left text-xs text-[#666]">
                      <th className="py-2 font-normal">标的</th>
                      <th className="py-2 text-right font-normal">数量</th>
                      <th className="py-2 text-right font-normal">成本</th>
                      <th className="py-2 text-right font-normal">市值</th>
                      <th className="py-2 text-right font-normal">占比</th>
                      <th className="py-2 text-right font-normal">收益率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((holding) => (
                      <tr key={`${holding.code}-${holding.side}`} className="border-b border-black/5">
                        <td className="py-3">
                          <div className="font-medium">{holding.stockName || holding.code}</div>
                          <div className="text-xs text-[#666]">{holding.code}</div>
                        </td>
                        <td className="num py-3 text-right">{holding.qty}</td>
                        <td className="num py-3 text-right">{holding.costPrice || "—"}</td>
                        <td className="num py-3 text-right">{holding.marketVal} {holding.currency}</td>
                        <td className="num py-3 text-right">{holding.weight}%</td>
                        <td className="py-3 text-right"><Percent value={holding.plRatio} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="rounded-2xl border border-black/10 bg-white p-6">
              <h2 className="text-lg font-semibold">交易记录</h2>
              {activity.length === 0 ? (
                <p className="mt-4 text-sm text-[#666]">暂无记录。</p>
              ) : (
                <ol className="mt-4 divide-y divide-black/10">
                  {activity.map((item) => (
                    <li key={item.id} className="grid grid-cols-[9rem_1fr] gap-4 py-3 text-sm">
                      <time className="text-xs text-[#666]">{when(item.createdAt)}</time>
                      <div>
                        <div className="font-medium">{portfolio.kindLabel(item.kind)} · {item.stockName || item.code} <span className="font-normal text-[#666]">{item.side}</span></div>
                        <div className="num mt-1 text-xs text-[#666]">
                          {item.qty ? `数量 ${item.qty}` : ""}
                          {item.price ? `  价格 ${item.price}` : ""}
                        </div>
                        {item.note ? <p className="mt-2">{item.note}</p> : null}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-black/10 bg-white p-5">
              <h2 className="text-lg font-semibold">Webhook</h2>
              <p className="mt-2 text-sm leading-6 text-[#666]">把接收地址留在这里，用来接收这个账户以后的变动通知。</p>
              {isOwner ? (
                <p className="mt-4 rounded-xl bg-[#fafafa] px-3 py-3 text-sm text-[#666]">这是你自己的主页。订阅者可以在这里登记接收地址。</p>
              ) : (
                <>
                  <ul className="mt-4 space-y-2">
                    {hooks.length === 0 ? <li className="text-sm text-[#666]">还没有地址。</li> : null}
                    {hooks.map((hook) => (
                      <li key={hook.id} className="num rounded-lg bg-[#fafafa] px-3 py-2 text-xs">{hook.url}</li>
                    ))}
                  </ul>
                  <form action={saveWebhookAction} className="mt-4 space-y-2">
                    <input type="hidden" name="publisherId" value={publisherId} />
                    <input name="url" type="url" required placeholder="https://example.com/wire" className="h-10 w-full rounded-lg border border-black/10 px-3 outline-none focus:border-black" />
                    <button className="h-10 w-full rounded-lg bg-black text-sm text-white" type="submit">添加地址</button>
                  </form>
                </>
              )}
            </section>
            {subscribed && !isOwner ? (
              <div className="rounded-2xl border border-black/10 bg-white p-5">
                <div className="text-xs text-[#666]">本月有效至</div>
                <div className="mt-2 text-sm">{expiresAt ? when(expiresAt) : "—"}</div>
                <form action={followAction} className="mt-4">
                  <input type="hidden" name="publisherId" value={publisherId} />
                  <button className="h-10 w-full rounded-lg bg-black text-sm text-white" type="submit">再订一个月</button>
                </form>
                <form action={followAction} className="mt-2">
                  <input type="hidden" name="publisherId" value={publisherId} />
                  <input type="hidden" name="intent" value="cancel" />
                  <button className="h-10 w-full text-sm text-[#666]" type="submit">取消订阅</button>
                </form>
              </div>
            ) : null}
          </aside>
        </div>
      ) : (
        <section className="mt-6 grid gap-4 rounded-2xl border border-black/10 bg-white p-6 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="text-xl font-semibold">订阅后开放</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="rounded-xl bg-[#fafafa] px-4 py-3">仓位：数量、市值、占比和现金</li>
              <li className="rounded-xl bg-[#fafafa] px-4 py-3">交易记录：方向、标的和时间</li>
              <li className="rounded-xl bg-[#fafafa] px-4 py-3">Webhook：登记变动通知地址</li>
            </ul>
          </div>
          <div className="flex flex-col justify-between rounded-2xl bg-black p-6 text-white">
            <div>
              <div className="text-sm text-white/60">月费</div>
              <div className="num mt-2 text-4xl">{amountLabel(subscribeAmount)}</div>
              <p className="mt-3 text-sm text-white/70">一次开通 30 天。到期后仓位、记录和 Webhook 会关闭，需要再订一个月。</p>
            </div>
            {loggedIn ? (
              <form action={followAction} className="mt-6">
                <input type="hidden" name="publisherId" value={publisherId} />
                <button className="h-10 w-full rounded-lg bg-white text-sm font-medium text-black" type="submit">订阅一个月</button>
              </form>
            ) : (
              <a href="/login" className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-white text-sm font-medium text-black">登录后订阅</a>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
