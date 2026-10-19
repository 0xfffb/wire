import { NextResponse } from "next/server";
import { sessionStore } from "@/auth/sessions";
import { portfolio } from "@/read/portfolio";

export async function GET() {
  const user = await sessionStore.currentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ activity: portfolio.privateActivities(user.id) });
}
