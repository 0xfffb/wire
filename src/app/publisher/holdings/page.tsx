import Link from "next/link";
import { redirect } from "next/navigation";
import { sessionStore } from "@/auth/sessions";
import { brokerConnections } from "@/broker/connections";
import { portfolio } from "@/read/portfolio";

export default async function HoldingsPage() {
  const user = await sessionStore.currentUser();
  if (!user) redirect("/login");
  const { connection } = brokerConnections.forUser(user.id, "futu");
  if (!connection) {
    return <p className="text-sm text-stone-600">连接富途后才能查看持仓。<Link className="underline" href="/publisher/broker">去授权</Link></p>;
  }
  const holdings = portfolio.privateHoldings(user.id);
  const funds = portfolio.funds(user.id);
  return (
    <div>
      <h1 className="text-3xl font-medium tracking-tight">持仓</h1>
      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        {funds.map((item) => (
          <div key={item.markets.join("-")} className="border-t border-stone-400 pt-4">
            <div className="text-[11px] tracking-[0.16em] text-stone-500 uppercase">{item.markets.join(" / ") || "市场未知"}</div>
            <div className="num mt-3 text-3xl">{item.cash || "—"} <span className="text-base text-stone-500">{item.currency}</span></div>
            <div className="num mt-2 text-sm text-stone-600">净资产 {item.totalAssets || "—"} {item.currency}</div>
            {item.balances.length > 0 ? (
              <div className="num mt-3 text-xs text-stone-500">{item.balances.map((balance) => `${balance.cash} ${balance.currency}`).join("   ")}</div>
            ) : null}
          </div>
        ))}
      </div>
      {holdings.length === 0 ? (
        <p className="mt-10 text-sm text-stone-500">这个账户当前没有股票持仓。</p>
      ) : (
        <table className="mt-10 w-full text-sm">
          <thead>
            <tr className="border-b border-stone-400 text-left text-[11px] tracking-[0.14em] text-stone-500 uppercase">
              <th className="py-3 font-normal">标的</th>
              <th className="py-3 font-normal">方向</th>
              <th className="py-3 text-right font-normal">数量</th>
              <th className="py-3 text-right font-normal">成本</th>
              <th className="py-3 text-right font-normal">市值</th>
              <th className="py-3 text-right font-normal">盈亏</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => (
              <tr key={`${holding.accountId}-${holding.code}-${holding.side}`} className="border-b border-stone-300/80">
                <td className="py-4">
                  <div>{holding.stockName || holding.code}</div>
                  <div className="text-xs text-stone-500">{holding.code}</div>
                </td>
                <td className="py-4">{holding.side}</td>
                <td className="num py-4 text-right">{holding.qty}</td>
                <td className="num py-4 text-right">{holding.costPrice || "—"}</td>
                <td className="num py-4 text-right">{holding.marketVal} {holding.currency}</td>
                <td className="num py-4 text-right">{holding.plRatio ? `${holding.plRatio}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
