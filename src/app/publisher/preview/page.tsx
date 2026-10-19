import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AccountProfile } from "../../account-profile";
import { sessionStore } from "@/auth/sessions";
import { Database } from "@/db/database";
import { publisherProfiles } from "@/db/schema";
import { portfolio } from "@/read/portfolio";

export default async function PreviewPage() {
  const user = await sessionStore.currentUser();
  if (!user) redirect("/login");
  const profile = Database.current().select().from(publisherProfiles).where(eq(publisherProfiles.userId, user.id)).get();
  if (!profile) redirect("/publisher");
  const summary = portfolio.summary(user.id);
  const view = portfolio.publicView(user.id);
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
      expiresAt={null}
      syncedAt={summary.syncedAt}
      subscribed
      isOwner
      loggedIn
      holdings={view.holdings}
      activity={view.activity}
      funds={view.funds}
      hooks={[]}
    />
  );
}
