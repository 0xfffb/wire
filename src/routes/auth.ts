import type { Hono } from "hono";

import { hashPassword, verifyPassword } from "../auth/passwords";
import { attachSessionCookie, clearSession, createSession } from "../middleware";
import { loginBody, registerBody } from "../schemas/auth";
import { Users } from "../services/users";
import type { AppEnv } from "./index";

async function readBody(context: { req: { json: () => Promise<unknown> } }) {
  try {
    return await context.req.json();
  } catch {
    return null;
  }
}

function registerAuthRoutes(app: Hono<AppEnv>) {
  app.post("/api/auth/register", async (context) => {
    const raw = await readBody(context);
    const parsed = registerBody.safeParse(raw);
    if (!parsed.success) {
      const mismatch = parsed.error.issues.some((issue) => issue.message === "password_mismatch");
      return context.json({ error: mismatch ? "password_mismatch" : "invalid_body" }, 400);
    }

    const { handle, email, password } = parsed.data;
    const users = new Users(context.get("deps").database);
    const created = await users.create({
      email,
      handle,
      passwordHash: await hashPassword(password),
      name: handle,
    });
    if ("error" in created) {
      return context.json({ error: created.error }, 409);
    }

    const token = await createSession(context.get("deps").kv, created.user.id);
    attachSessionCookie(context, token);
    return context.json(created.user, 201);
  });

  app.post("/api/auth/login", async (context) => {
    const raw = await readBody(context);
    const parsed = loginBody.safeParse(raw);
    if (!parsed.success) {
      return context.json({ error: "invalid_body" }, 400);
    }

    const users = new Users(context.get("deps").database);
    const account = await users.findByEmail(parsed.data.email);
    const ok = account ? await verifyPassword(parsed.data.password, account.passwordHash) : false;
    if (!account || !ok) {
      return context.json({ error: "invalid_credentials" }, 401);
    }

    const view = await users.getView(account.id);
    if (!view) {
      return context.json({ error: "invalid_credentials" }, 401);
    }

    const token = await createSession(context.get("deps").kv, account.id);
    attachSessionCookie(context, token);
    return context.json(view);
  });

  app.post("/api/auth/logout", async (context) => {
    await clearSession(context, context.get("deps").kv);
    return context.json({ ok: true });
  });
}

export { registerAuthRoutes };
