import { isRedirectError } from "next/dist/client/components/redirect-error";
import { NextResponse } from "next/server";
import { completeFutuAuth } from "@/app/actions";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (error || !code || !state) {
    return NextResponse.redirect(new URL(`/publisher/broker?error=${encodeURIComponent(error || "callback")}`, url.origin));
  }
  try {
    await completeFutuAuth(code, state);
  } catch (caught) {
    if (isRedirectError(caught)) throw caught;
    const message = caught instanceof Error ? caught.message : "换取富途授权失败";
    return NextResponse.redirect(new URL(`/publisher/broker?error=${encodeURIComponent(message)}`, url.origin));
  }
  return NextResponse.redirect(new URL("/publisher/broker", url.origin));
}
