import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { logoutAction } from "./actions";
import { sessionStore } from "@/auth/sessions";
import { Database } from "@/db/database";
import { publisherProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Wire",
  description: "分享股票仓位与记录",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await sessionStore.currentUser();
  const profile = user
    ? Database.current().select().from(publisherProfiles).where(eq(publisherProfiles.userId, user.id)).get()
    : null;
  return (
    <html lang="zh-CN" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-[#fafafa]">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-black/10 bg-white px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm font-semibold">
              Wire
            </Link>
            <nav className="flex items-center gap-4 text-sm text-[#666]">
              <Link href="/" className="hover:text-black">发现</Link>
              {user ? <Link href="/following" className="hover:text-black">订阅</Link> : null}
              {user ? <Link href="/publisher" className="hover:text-black">控制台</Link> : null}
            </nav>
          </div>
          {user ? (
            <form action={logoutAction} className="flex items-center gap-4 text-sm">
              <span className="text-[#666]">{profile?.displayName}</span>
              <button className="text-[#666] hover:text-black" type="submit">退出</button>
            </form>
          ) : (
            <Link href="/login" className="rounded-md bg-black px-3 py-1.5 text-sm text-white">
              登录
            </Link>
          )}
        </header>
        {children}
      </body>
    </html>
  );
}
