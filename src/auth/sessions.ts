import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { Database } from "@/db/database";
import { sessions, users } from "@/db/schema";

const COOKIE = "wire_session";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export class Sessions {
  private hash(token: string) {
    return createHash("sha256").update(token).digest("base64url");
  }

  async create(userId: string) {
    const token = randomBytes(32).toString("base64url");
    Database.current()
      .insert(sessions)
      .values({
        id: crypto.randomUUID(),
        userId,
        tokenHash: this.hash(token),
        expiresAt: Date.now() + THIRTY_DAYS,
      })
      .run();
    const jar = await cookies();
    jar.set(COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: THIRTY_DAYS / 1000,
    });
  }

  async destroy() {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (token) {
      Database.current().delete(sessions).where(eq(sessions.tokenHash, this.hash(token))).run();
    }
    jar.delete(COOKIE);
  }

  async currentUser() {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (!token) return null;
    const db = Database.current();
    const session = db.select().from(sessions).where(eq(sessions.tokenHash, this.hash(token))).get();
    if (!session || session.expiresAt < Date.now()) return null;
    return db.select().from(users).where(eq(users.id, session.userId)).get() ?? null;
  }
}

export const sessionStore = new Sessions();
