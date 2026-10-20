import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";

import type { Deps } from "../deps";

const SESSION_COOKIE = "wire_session";

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

export { SESSION_COOKIE, requireAuth, sessionKey };
export type { AuthEnv, SessionRecord };
