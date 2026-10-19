import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { sessionStore } from "@/auth/sessions";
import { Database } from "@/db/database";
import { publisherProfiles } from "@/db/schema";
import { portfolio } from "@/read/portfolio";

export async function GET(_request: Request, context: { params: Promise<{ handle: string }> }) {
  const { handle } = await context.params;
  const profile = Database.current().select().from(publisherProfiles).where(eq(publisherProfiles.handle, handle)).get();
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const viewer = await sessionStore.currentUser();
  if (!portfolio.canRead(profile.userId, viewer?.id ?? null)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const summary = portfolio.summary(profile.userId);
  const open = portfolio.subscribed(profile.userId, viewer?.id ?? null);
  const view = open ? portfolio.publicView(profile.userId) : null;
  return NextResponse.json({
    profile: { handle: profile.handle, displayName: profile.displayName, bio: profile.bio },
    returnRate: summary.returnRate,
    changeRate: summary.changeRate,
    subscribeAmount: summary.subscribeAmount,
    syncedAt: summary.syncedAt,
    subscribed: open,
    holdings: view?.holdings ?? [],
    funds: view?.funds ?? [],
    activity: view?.activity ?? [],
  });
}
