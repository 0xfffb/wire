import Link from "next/link";
import { redirect } from "next/navigation";
import { saveNoteAction } from "@/app/actions";
import { sessionStore } from "@/auth/sessions";
import { brokerConnections } from "@/broker/connections";
import { portfolio } from "@/read/portfolio";

export default async function ActivityPage() {
  const user = await sessionStore.currentUser();
  if (!user) redirect("/login");
  const { connection } = brokerConnections.forUser(user.id, "futu");
  if (!connection) {
    return <p className="text-sm text-stone-600">连接富途后才能查看记录。<Link className="underline" href="/publisher/broker">去授权</Link></p>;
  }
  const activity = portfolio.privateActivities(user.id);
  return (
    <div>
      <h1 className="text-3xl font-medium tracking-tight">记录</h1>
      {activity.length === 0 ? (
        <p className="mt-8 text-sm text-stone-500">还没有仓位变动或成交。</p>
      ) : (
        <ol className="mt-8 divide-y divide-stone-300 border-y border-stone-300">
          {activity.map((item) => (
            <li key={item.id} className="grid gap-4 py-5 text-sm md:grid-cols-[11rem_1fr]">
              <time className="text-xs text-stone-500">{new Date(item.createdAt).toLocaleString("zh-CN")}</time>
              <div>
                <div>
                  {portfolio.kindLabel(item.kind)} · {item.stockName || item.code}
                  <span className="text-stone-500"> {item.side}</span>
                </div>
                <div className="num mt-1 text-xs text-stone-500">
                  {item.qty ? `数量 ${item.qty}` : ""}
                  {item.price ? `  价格 ${item.price}` : ""}
                </div>
                <form action={saveNoteAction} className="mt-3 flex gap-3">
                  <input type="hidden" name="activityId" value={item.id} />
                  <input name="body" defaultValue={item.note ?? ""} placeholder="备注" className="flex-1 border-b border-stone-400 bg-transparent py-1 outline-none" />
                  <button className="text-sm" type="submit">保存</button>
                </form>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
