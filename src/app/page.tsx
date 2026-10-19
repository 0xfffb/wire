import Link from "next/link";
import { amountLabel, Percent } from "./percent";
import { ReturnChart } from "./return-chart";
import { portfolio } from "@/read/portfolio";

const markets: Array<[string, string]> = [
  ["", "全部市场"],
  ["HK", "港股"],
  ["US", "美股"],
  ["HKCC", "A股通"],
  ["FUTURES", "期货"],
  ["SG", "新加坡"],
  ["JP", "日本"],
];

const sorts: Array<[string, string]> = [
  ["return", "收益率"],
  ["amount", "订阅金额"],
  ["name", "名称"],
];

const fees: Array<[string, string]> = [
  ["", "全部"],
  ["free", "免费"],
  ["paid", "付费"],
];

const marketLabel: Record<string, string> = Object.fromEntries(markets.filter(([value]) => value));

function query(current: { market?: string; sort?: string; fee?: string }, patch: Record<string, string>) {
  const next = new URLSearchParams();
  const merged = { market: current.market ?? "", sort: current.sort ?? "return", fee: current.fee ?? "", ...patch };
  for (const [key, value] of Object.entries(merged)) {
    if (value) next.set(key, value);
  }
  const text = next.toString();
  return text ? `/?${text}` : "/";
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-3">
      <div className="px-1 pb-2 text-xs font-medium text-[#666]">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ market?: string; sort?: string; fee?: string }>;
}) {
  const params = await searchParams;
  const market = params.market ?? "";
  const sort = params.sort ?? "return";
  const fee = params.fee ?? "";
  const accounts = portfolio
    .discover()
    .filter((account) => !market || account.markets.includes(market))
    .filter((account) => (fee === "free" ? account.subscribeAmount === "0" : fee === "paid" ? account.subscribeAmount !== "0" : true))
    .sort((a, b) => {
      if (sort === "name") return a.displayName.localeCompare(b.displayName, "zh-CN");
      if (sort === "amount") return Number(a.subscribeAmount) - Number(b.subscribeAmount);
      return Number(b.returnRate ?? "-999999") - Number(a.returnRate ?? "-999999");
    });

  const linkClass = (active: boolean) =>
    `block rounded-lg px-2.5 py-2 text-sm ${active ? "bg-black text-white" : "text-[#444] hover:bg-[#fafafa]"}`;

  return (
    <div className="grid min-h-[calc(100vh-4rem)] grid-cols-[260px_minmax(0,1fr)] bg-[#fafafa]">
      <aside className="space-y-4 border-r border-black/10 p-4">
        <FilterGroup title="市场">
          {markets.map(([value, label]) => (
            <Link key={value || "all"} href={query(params, { market: value ?? "" })} className={linkClass(market === value)}>
              {label}
            </Link>
          ))}
        </FilterGroup>
        <FilterGroup title="订阅费用">
          {fees.map(([value, label]) => (
            <Link key={value || "any"} href={query(params, { fee: value ?? "" })} className={linkClass(fee === value)}>
              {label}
            </Link>
          ))}
        </FilterGroup>
      </aside>
      <section>
        <div className="border-b border-black/10 bg-white px-8 py-8">
          <p className="text-sm text-[#666]">发现</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">公开账户</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#666]">
            先看简介、涨跌幅、收益率和月费。订阅开通 30 天，期间可以打开仓位、交易记录和 Webhook。
          </p>
          <div className="mt-6 flex gap-8">
            <div>
              <div className="num text-2xl font-semibold">{accounts.length}</div>
              <div className="mt-1 text-xs text-[#666]">当前结果</div>
            </div>
            <div>
              <div className="num text-2xl font-semibold">{accounts.filter((account) => account.subscribeAmount === "0").length}</div>
              <div className="mt-1 text-xs text-[#666]">免费账户</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 border-b border-black/10 bg-white px-8 py-3">
          <span className="mr-2 text-xs text-[#666]">排序</span>
          {sorts.map(([value, label]) => (
            <Link
              key={value}
              href={query(params, { sort: value ?? "" })}
              className={`rounded-full px-3 py-1 text-sm ${sort === value ? "bg-black text-white" : "text-[#444] hover:bg-[#fafafa]"}`}
            >
              {label}
            </Link>
          ))}
        </div>
        {accounts.length === 0 ? (
          <div className="m-6 rounded-2xl border border-dashed border-black/15 bg-white px-6 py-16 text-center text-sm text-[#666]">
            这个筛选下还没有公开账户。
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3 p-4">
            {accounts.map((account) => (
              <Link
                key={account.userId}
                href={`/p/${account.handle}`}
                className="flex min-w-0 flex-col rounded-xl border border-black/10 bg-white p-3 shadow-sm transition hover:border-black/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black text-sm font-semibold text-white">
                      {account.displayName.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{account.displayName}</div>
                      <div className="truncate text-xs text-[#666]">@{account.handle}</div>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#fafafa] px-2 py-0.5 text-[11px]">{amountLabel(account.subscribeAmount)}</span>
                </div>
                <p className="mt-2 line-clamp-2 min-h-8 text-xs leading-4 text-[#666]">{account.bio || "这个账户还没有写简介。"}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {account.markets.length === 0 ? <span className="text-[11px] text-[#999]">未同步市场</span> : null}
                  {account.markets.map((item) => (
                    <span key={item} className="rounded-full border border-black/10 px-1.5 py-px text-[11px] text-[#444]">
                      {marketLabel[item] ?? item}
                    </span>
                  ))}
                </div>
                <div className="mt-2">
                  <ReturnChart points={account.curve} height={88} />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                  <div className="rounded-lg bg-[#fafafa] px-1 py-1.5">
                    <div className="text-[10px] text-[#666]">涨跌幅</div>
                    <div className="text-xs"><Percent value={account.changeRate} /></div>
                  </div>
                  <div className="rounded-lg bg-[#fafafa] px-1 py-1.5">
                    <div className="text-[10px] text-[#666]">收益率</div>
                    <div className="text-xs"><Percent value={account.returnRate} /></div>
                  </div>
                  <div className="rounded-lg bg-[#fafafa] px-1 py-1.5">
                    <div className="text-[10px] text-[#666]">持仓</div>
                    <div className="num text-xs">{account.holdingCount}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
