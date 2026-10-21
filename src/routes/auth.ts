import type { Hono } from "hono";

import { hashPassword, verifyPassword } from "../auth/passwords";
import { attachSessionCookie, clearSession, createSession, purgePublic, requireAuth } from "../middleware";
import { loginBody, setupBody } from "../schemas/auth";
import { Users } from "../services/users";
import type { AppEnv } from "./index";

async function readJson(context: { req: { json: () => Promise<unknown> } }) {
  try {
    return await context.req.json();
  } catch {
    return null;
  }
}

function registerAuthRoutes(app: Hono<AppEnv>) {
  app.get("/api/setup", async (context) => {
    const users = new Users(context.get("deps").database);
    return context.json({ admin: await users.hasAdmin() });
  });

  app.post("/api/auth/setup", async (context) => {
    const parsed = setupBody.safeParse(await readJson(context));
    if (!parsed.success) {
      const mismatch = parsed.error.issues.some((issue) => issue.message === "password_mismatch");
      return context.json({ error: mismatch ? "password_mismatch" : "invalid_body" }, 400);
    }
    const users = new Users(context.get("deps").database);
    const name = parsed.data.email.split("@")[0] || "admin";
    const created = await users.create({
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      name: name.slice(0, 24),
    });
    if ("error" in created) return context.json({ error: created.error }, 409);
    const token = await createSession(context.get("deps").kv, created.user.id);
    attachSessionCookie(context, token);
    purgePublic(context.executionCtx);
    return context.json(created.user, 201);
  });

  app.post("/api/auth/login", async (context) => {
    const parsed = loginBody.safeParse(await readJson(context));
    if (!parsed.success) return context.json({ error: "invalid_body" }, 400);
    const users = new Users(context.get("deps").database);
    if (!(await users.hasAdmin())) return context.json({ error: "no_admin" }, 409);
    const account = await users.findByEmail(parsed.data.email);
    const ok = account ? await verifyPassword(parsed.data.password, account.password_hash) : false;
    if (!account || !ok) return context.json({ error: "invalid_credentials" }, 401);
    const token = await createSession(context.get("deps").kv, account.id);
    attachSessionCookie(context, token);
    return context.json(users.me(account));
  });

  app.post("/api/auth/logout", requireAuth, async (context) => {
    await clearSession(context, context.get("deps").kv);
    return context.json({ ok: true });
  });

  app.get("/api/me", requireAuth, async (context) => {
    const users = new Users(context.get("deps").database);
    const user = await users.getById(context.get("userId") ?? "");
    if (!user) return context.json({ error: "unauthorized" }, 401);
    return context.json(users.me(user));
  });
}

export { registerAuthRoutes };
