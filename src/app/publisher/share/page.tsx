import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { saveShareAction } from "@/app/actions";
import { sessionStore } from "@/auth/sessions";
import { Database } from "@/db/database";
import { sharePolicies } from "@/db/schema";

export default async function SharePage() {
  const user = await sessionStore.currentUser();
  if (!user) redirect("/login");
  const policy = Database.current().select().from(sharePolicies).where(eq(sharePolicies.userId, user.id)).get();
  return (
    <form action={saveShareAction} className="max-w-lg">
      <h1 className="text-3xl font-medium tracking-tight">公开</h1>
      <fieldset className="mt-8 space-y-3 border-t border-stone-300 pt-6 text-sm">
        <legend className="text-[11px] tracking-[0.16em] text-stone-500 uppercase">谁可以看</legend>
        <label className="flex gap-3">
          <input type="radio" name="audience" value="public" defaultChecked={policy?.audience !== "followers"} />
          公开
        </label>
        <label className="flex gap-3">
          <input type="radio" name="audience" value="followers" defaultChecked={policy?.audience === "followers"} />
          仅关注者
        </label>
      </fieldset>
      <label className="mt-8 block border-t border-stone-300 pt-6 text-sm">
        每月订阅金额（美元，0 为免费）
        <input name="subscribeAmount" defaultValue={policy?.subscribeAmount ?? "0"} inputMode="decimal" className="mt-2 h-9 w-40 rounded-md border border-black/10 px-3" />
      </label>
      <p className="mt-4 text-xs leading-5 text-stone-500">金额按月计算。订阅开通 30 天，到期后需要再订一个月。未订阅只能看到简介、收益率和月费。</p>
      <button className="mt-8 bg-stone-950 px-4 py-2 text-sm text-[#f4f1ea]" type="submit">
        保存
      </button>
    </form>
  );
}
