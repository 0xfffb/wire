import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AccountProfile } from "../../account-profile";
import { sessionStore } from "@/auth/sessions";
import { Database } from "@/db/database";
import { publisherProfiles } from "@/db/schema";
import { portfolio } from "@/read/portfolio";

export default async function PublisherPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = Database.current().select().from(publisherProfiles).where(eq(publisherProfiles.handle, handle)).get();
  if (!profile) notFound();
  const viewer = await sessionStore.currentUser();
  if (!portfolio.canRead(profile.userId, viewer?.id ?? null)) {
    return <p className="px-6 py-10 text-sm text-[#666]">这个账户只对订阅者开放。</p>;
  }
  const summary = portfolio.summary(profile.userId);
  const open = portfolio.subscribed(profile.userId, viewer?.id ?? null);
  const view = open ? portfolio.publicView(profile.userId) : null;
  const hooks = open && viewer && viewer.id !== profile.userId ? portfolio.webhooks(viewer.id, profile.userId) : [];
  const expiresAt = viewer && viewer.id !== profile.userId ? portfolio.subscription(viewer.id, profile.userId)?.expiresAt ?? null : null;
  return (
    <AccountProfile
      publisherId={profile.userId}
      handle={profile.handle}
      displayName={profile.displayName}
      bio={profile.bio}
      returnRate={summary.returnRate}
      curve={summary.curve}
      changeRate={summary.changeRate}
      subscribeAmount={summary.subscribeAmount}
      expiresAt={expiresAt}
      syncedAt={summary.syncedAt}
      subscribed={open}
      isOwner={viewer?.id === profile.userId}
      loggedIn={Boolean(viewer)}
      holdings={view?.holdings ?? []}
      activity={view?.activity ?? []}
      funds={view?.funds ?? []}
      hooks={hooks}
    />
  );
}
