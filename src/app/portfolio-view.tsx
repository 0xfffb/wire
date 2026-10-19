import { portfolio, type ActivityView, type PublicHolding } from "@/read/portfolio";

function when(value: number) {
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export function PortfolioView({
  displayName,
  bio,
  syncedAt,
  holdings,
  activity,
  funds,
}: {
  displayName: string;
  bio: string;
  syncedAt: number | null;
  holdings: PublicHolding[];
  activity: ActivityView[];
  funds: Array<{ markets: string[]; cash: string; totalAssets: string; currency: string; balances: Array<{ currency: string; cash: string }> }>;
}) {
  return (
    <div>
      <header className="border-b border-stone-300/80 pb-6">
        <p className="text-[11px] tracking-[0.18em] text-stone-500 uppercase">Portfolio</p>
        <h1 className="mt-2 text-4xl font-medium tracking-tight">{displayName}</h1>
        {bio ? <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600">{bio}</p> : null}
        <p className="mt-3 text-xs text-stone-500">
          {syncedAt ? `同步于 ${when(syncedAt)}` : "还没有同步"} · 不构成投资建议
        </p>
      </header>

      <section className="mt-8 grid gap-px bg-stone-300/70 sm:grid-cols-2">
        {funds.length === 0 ? <p className="bg-[#f4f1ea] py-6 text-sm text-stone-500">暂无现金数据。</p> : null}
        {funds.map((item) => (
          <div key={item.markets.join("-")} className="bg-[#f4f1ea] py-5 pr-8">
            <div className="text-[11px] tracking-[0.16em] text-stone-500 uppercase">{item.markets.join(" / ") || "市场未知"}</div>
            <div className="num mt-3 text-3xl tracking-tight">{item.cash || "—"} <span className="text-base text-stone-500">{item.currency}</span></div>
            <div className="num mt-2 text-sm text-stone-600">净资产 {item.totalAssets || "—"} {item.currency}</div>
            {item.balances.length > 0 ? (
              <div className="num mt-3 text-xs text-stone-500">{item.balances.map((balance) => `${balance.cash} ${balance.currency}`).join("   ")}</div>
            ) : null}
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-[11px] tracking-[0.18em] text-stone-500 uppercase">持仓</h2>
        {holdings.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">当前没有股票持仓。</p>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-stone-400 text-left text-[11px] tracking-[0.14em] text-stone-500 uppercase">
                <th className="py-3 font-normal">标的</th>
                <th className="py-3 font-normal">方向</th>
                <th className="py-3 text-right font-normal">数量</th>
                <th className="py-3 text-right font-normal">市值</th>
                <th className="py-3 text-right font-normal">占比</th>
                <th className="py-3 text-right font-normal">盈亏</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((holding) => (
                <tr key={`${holding.code}-${holding.side}`} className="border-b border-stone-300/70">
                  <td className="py-4">
                    <div>{holding.stockName || holding.code}</div>
                    <div className="text-xs text-stone-500">{holding.code}</div>
                  </td>
                  <td className="py-4 text-stone-600">{holding.side}</td>
                  <td className="num py-4 text-right">{holding.qty}</td>
                  <td className="num py-4 text-right">{holding.marketVal} {holding.currency}</td>
                  <td className="num py-4 text-right">{holding.weight}%</td>
                  <td className="num py-4 text-right">{holding.plRatio ? `${holding.plRatio}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-[11px] tracking-[0.18em] text-stone-500 uppercase">记录</h2>
        {activity.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">暂无记录。</p>
        ) : (
          <ol className="mt-4 divide-y divide-stone-300/80">
            {activity.map((item) => (
              <li key={item.id} className="grid grid-cols-[8rem_1fr_auto] gap-4 py-4 text-sm">
                <time className="text-xs text-stone-500">{when(item.createdAt)}</time>
                <div>
                  <div>
                    {portfolio.kindLabel(item.kind)} · {item.stockName || item.code}
                    <span className="text-stone-500"> {item.side}</span>
                  </div>
                  <div className="num mt-1 text-xs text-stone-500">
                    {item.qty ? `数量 ${item.qty}` : ""}
                    {item.price ? `  价格 ${item.price}` : ""}
                  </div>
                  {item.note ? <p className="mt-2 text-stone-700">{item.note}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
