import Link from "next/link";
import { redirect } from "next/navigation";
import { BrokerMark, brokerName } from "./broker-mark";
import { PublisherNav } from "./nav";
import { sessionStore } from "@/auth/sessions";
import { brokerConnections } from "@/broker/connections";

const statusLabel: Record<string, string> = {
  authorized: "已授权",
  syncing: "同步中",
  needs_reauth: "需要重新授权",
  error: "同步失败",
};

export default async function PublisherLayout({ children }: { children: React.ReactNode }) {
  const user = await sessionStore.currentUser();
  if (!user) redirect("/login");
  const { connection } = brokerConnections.forUser(user.id, "futu");
  return (
    <div className="grid min-h-[calc(100vh-4rem)] grid-cols-[220px_minmax(0,1fr)]">
      <aside className="border-r border-black/10 px-4 py-6">
        <div className="px-2 text-xs text-[#666]">控制台</div>
        <PublisherNav />
      </aside>
      <div>
        <div className="flex items-center justify-between gap-6 border-b border-black/10 px-8 py-3 text-sm">
          <div className="flex items-center gap-3">
            <BrokerMark id="futu" />
            <div>
              <div className="font-medium">{brokerName("futu")}</div>
              <div className="text-xs text-[#666]">
                {connection?.lastSyncAt ? new Date(connection.lastSyncAt).toLocaleString("zh-CN") : "还没有成功同步"}
              </div>
            </div>
          </div>
          <div className="text-right">
            {connection ? (
              <div className={connection.status === "error" || connection.status === "needs_reauth" ? "text-[#e5484d]" : "text-[#171717]"}>
                {statusLabel[connection.status] ?? connection.status}
              </div>
            ) : (
              <Link href="/publisher/broker" className="text-[#666] hover:text-black">未连接</Link>
            )}
            {connection?.lastError ? <div className="mt-1 max-w-xs text-xs text-[#e5484d]">{connection.lastError}</div> : null}
          </div>
        </div>
        <div className="px-8 py-8">{children}</div>
      </div>
    </div>
  );
}
