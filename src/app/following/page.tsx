import Link from "next/link";
import { redirect } from "next/navigation";
import { amountLabel, Percent } from "../percent";
import { sessionStore } from "@/auth/sessions";
import { portfolio } from "@/read/portfolio";

export default async function FollowingPage() {
  const user = await sessionStore.currentUser();
  if (!user) redirect("/login");
  const accounts = portfolio.following(user.id).map((profile) => ({ ...profile, ...portfolio.summary(profile.userId) }));
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">已订阅</h1>
      {accounts.length === 0 ? (
        <p className="mt-6 text-sm text-[#666]">还没有订阅账户。</p>
      ) : (
        <div className="mt-6 border-t border-black/10">
          {accounts.map((account) => (
            <Link key={account.userId} href={`/p/${account.handle}`} className="grid grid-cols-[1fr_9rem_6rem] items-center border-b border-black/10 py-4 hover:bg-[#fafafa]">
              <span>
                <span className="font-medium">{account.displayName}</span>
                <span className="mt-1 block text-xs text-[#666]">有效至 {new Date(account.expiresAt).toLocaleDateString("zh-CN")}</span>
              </span>
              <span className="text-right"><Percent value={account.returnRate} /></span>
              <span className="num text-right text-[#666]">{amountLabel(account.subscribeAmount)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
