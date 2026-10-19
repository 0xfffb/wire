import { redirect } from "next/navigation";
import { BrokerMark, brokerName } from "../broker-mark";
import { saveAccountsAction, startFutuAuth } from "@/app/actions";
import { sessionStore } from "@/auth/sessions";
import { brokerConnections } from "@/broker/connections";

const errors: Record<string, string> = {
  client: "还没有完成富途应用注册，请重新点击授权。",
  state: "授权状态已失效，请重新发起。",
  connect: "请先完成富途授权。",
  callback: "富途没有返回授权码。",
};

function errorText(error?: string) {
  if (!error) return "";
  return errors[error] ?? error;
}

export default async function BrokerPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await sessionStore.currentUser();
  if (!user) redirect("/login");
  const { error } = await searchParams;
  const { connection, accounts } = brokerConnections.forUser(user.id, "futu");
  const renewing = connection?.status === "authorized" || connection?.status === "syncing";
  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-medium tracking-tight">连接</h1>
      <section className="mt-8 overflow-hidden rounded-xl border border-black/10">
        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <BrokerMark id="futu" size={36} />
            <div>
              <div className="font-medium">{brokerName("futu")}</div>
              <div className="mt-1 text-xs text-[#666]">只读授权，令牌到期后自动续签</div>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className={connection && (connection.status === "error" || connection.status === "needs_reauth") ? "text-[#e5484d]" : ""}>
              {connection ? (connection.status === "authorized" || connection.status === "syncing" ? "已授权" : connection.status === "needs_reauth" ? "需要重新授权" : connection.status === "error" ? "同步失败" : connection.status) : "未连接"}
            </div>
            <form action={startFutuAuth} className="mt-2">
              <button className="text-xs text-[#666] hover:text-black" type="submit">
                {renewing ? "重新授权" : "授权"}
              </button>
            </form>
          </div>
        </div>
        {error ? <p className="px-4 pb-3 text-sm text-red-800">{errorText(error)}</p> : null}
        <form action={saveAccountsAction} className="border-t border-black/10 bg-[#fafafa] px-4 py-4">
          <h2 className="text-xs text-[#666]">纳入同步的账户</h2>
          {accounts.length === 0 ? (
            <p className="mt-3 text-sm text-[#666]">授权后，这个券商的账户会出现在这里。</p>
          ) : (
            <>
              <div className="mt-2">
                {accounts.map((account) => (
                  <label key={account.id} className="flex items-center gap-3 border-b border-black/5 py-3 text-sm last:border-b-0">
                    <input type="checkbox" name="account" value={account.id} defaultChecked={account.included === 1} />
                    <span>{JSON.parse(account.markets).join(" / ") || "市场未知"}</span>
                  </label>
                ))}
              </div>
              <button className="mt-4 rounded-md border border-black/10 bg-white px-3 py-1.5 text-sm" type="submit">
                保存
              </button>
            </>
          )}
        </form>
      </section>
    </div>
  );
}
