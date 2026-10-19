import Link from "next/link";
import { redirect } from "next/navigation";
import { sessionStore } from "@/auth/sessions";
import { portfolio } from "@/read/portfolio";

export default async function OverviewPage() {
  const user = await sessionStore.currentUser();
  if (!user) redirect("/login");
  const data = portfolio.overview(user.id);
  if (!data.connection) {
    return (
      <p className="text-sm text-stone-600">
        还没有连接富途。请先到<Link href="/publisher/broker" className="underline">连接</Link>完成只读授权。
      </p>
    );
  }
  const funds = portfolio.funds(user.id);
  return (
    <div>
      <h1 className="text-3xl font-medium tracking-tight">概览</h1>
      <div className="mt-8 grid gap-8 border-y border-stone-300 py-6 sm:grid-cols-3">
        {[
          ["账户", data.accountCount],
          ["持仓", data.holdingCount],
          ["今日变动", data.today],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <div className="text-[11px] tracking-[0.16em] text-stone-500 uppercase">{label}</div>
            <div className="num mt-2 text-4xl tracking-tight">{value}</div>
          </div>
        ))}
      </div>
      <div className="mt-8 divide-y divide-stone-300">
        {funds.map((item) => (
          <div key={item.markets.join("-")} className="grid grid-cols-[1fr_auto] items-baseline gap-6 py-5">
            <div>
              <div className="text-xs text-stone-500">{item.markets.join(" / ") || "市场未知"}</div>
              <div className="num mt-2 text-2xl">{item.cash || "—"} <span className="text-sm text-stone-500">{item.currency}</span></div>
            </div>
            <div className="num text-right text-sm text-stone-600">净资产 {item.totalAssets || "—"} {item.currency}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
