import type { Context, Next } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import type { Deps } from "../deps";
import type { KvStore } from "../storage/kv";

const SESSION_COOKIE = "wire_session";
const SESSION_TTL_SEC = 60 * 60 * 24 * 30;

type SessionRecord = {
  userId: string;
  expiresAt: number;
};

type AuthEnv = {
  Variables: {
    deps: Deps;
    userId: string;
  };
};

function sessionKey(token: string) {
  return `session:${token}`;
}

async function requireAuth(context: Context<AuthEnv>, next: Next) {
  const token = getCookie(context, SESSION_COOKIE);
  if (!token) {
    return context.json({ error: "unauthorized" }, 401);
  }

  const raw = await context.get("deps").kv.get(sessionKey(token));
  if (!raw) {
    return context.json({ error: "unauthorized" }, 401);
  }

  let session: SessionRecord;
  try {
    session = JSON.parse(raw) as SessionRecord;
  } catch {
    return context.json({ error: "unauthorized" }, 401);
  }

  if (!session.userId || session.expiresAt <= Date.now()) {
    await context.get("deps").kv.delete(sessionKey(token));
    return context.json({ error: "unauthorized" }, 401);
  }

  context.set("userId", session.userId);
  await next();
}

function sessionToken() {
  return [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function createSession(kv: KvStore, userId: string) {
  const token = sessionToken();
  const expiresAt = Date.now() + SESSION_TTL_SEC * 1000;
  await kv.put(sessionKey(token), JSON.stringify({ userId, expiresAt } satisfies SessionRecord), {
    ttlSec: SESSION_TTL_SEC,
  });
  return token;
}

function attachSessionCookie(context: Context, token: string) {
  const secure = new URL(context.req.url).protocol === "https:";
  setCookie(context, SESSION_COOKIE, token, {
    httpOnly: true,
    path: "/",
    sameSite: "Lax",
    secure,
    maxAge: SESSION_TTL_SEC,
  });
}

async function clearSession(context: Context, kv: KvStore) {
  const token = getCookie(context, SESSION_COOKIE);
  if (token) await kv.delete(sessionKey(token));
  deleteCookie(context, SESSION_COOKIE, { path: "/" });
}

export { SESSION_COOKIE, SESSION_TTL_SEC, attachSessionCookie, clearSession, createSession, requireAuth, sessionKey };
export type { AuthEnv, SessionRecord };
