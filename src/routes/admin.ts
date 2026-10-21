import type { Hono } from "hono";

import { SnaptradeError } from "../brokerage/snaptrade";
import { purgePublic, requireAuth } from "../middleware";
import { accountBody, keysBody, profileBody, shareBody } from "../schemas/auth";
import { Book } from "../services/book";
import { Connect } from "../services/connect";
import { Keys } from "../services/keys";
import { Users } from "../services/users";
import type { AppEnv } from "./index";

async function readJson(context: { req: { json: () => Promise<unknown> } }) {
  try {
    return await context.req.json();
  } catch {
    return null;
  }
}

function snaptradeFail(error: unknown) {
  if (error instanceof SnaptradeError) {
    const status = error.code === "reauth_needed" ? 409 : error.code === "snaptrade_unconfigured" ? 503 : 502;
    return { error: error.code, status, detail: error.detail } as const;
  }
  console.error("snaptrade", error);
  return { error: "snaptrade_unavailable" as const, status: 502 as const };
}

function registerAdminRoutes(app: Hono<AppEnv>) {
  app.get("/api/admin/overview", requireAuth, async (context) => {
    const overview = await new Book(context.get("deps").database).overview(context.get("userId") ?? "");
    if (!overview) return context.json({ error: "unauthorized" }, 401);
    const keys = await Keys.from(context.get("deps")).publicView();
    return context.json({ ...overview, configured: keys.configured });
  });

  app.get("/api/admin/connect", requireAuth, async (context) => {
    return context.json(await Connect.from(context.get("deps")).view(context.get("userId") ?? ""));
  });

  app.put("/api/admin/connect/keys", requireAuth, async (context) => {
    const parsed = keysBody.safeParse(await readJson(context));
    if (!parsed.success) return context.json({ error: "invalid_body" }, 400);
    const result = await Keys.from(context.get("deps")).save(parsed.data);
    if ("error" in result) return context.json({ error: result.error }, 503);
    return context.json(result);
  });

  app.post("/api/admin/connect", requireAuth, async (context) => {
    try {
      const origin = new URL(context.req.url).origin;
      return context.json(await Connect.from(context.get("deps")).start(context.get("userId") ?? "", origin));
    } catch (error) {
      const fail = snaptradeFail(error);
      return context.json({ error: fail.error, ...(fail.detail ? { detail: fail.detail } : {}) }, fail.status);
    }
  });

  app.put("/api/admin/connect/account", requireAuth, async (context) => {
    const parsed = accountBody.safeParse(await readJson(context));
    if (!parsed.success) return context.json({ error: "invalid_body" }, 400);
    const result = await Connect.from(context.get("deps")).setAccount(context.get("userId") ?? "", parsed.data.accountId);
    if (result && "error" in result) {
      const status = result.error === "disconnected" ? 409 : 400;
      return context.json({ error: result.error }, status);
    }
    return context.json(result);
  });

  app.delete("/api/admin/connect", requireAuth, async (context) => {
    const view = await Connect.from(context.get("deps")).disconnect(context.get("userId") ?? "");
    await purgePublic();
    return context.json(view);
  });

  app.get("/api/admin/holdings", requireAuth, async (context) => {
    return context.json(await new Book(context.get("deps").database).holdings(context.get("userId") ?? ""));
  });

  app.get("/api/admin/orders", requireAuth, async (context) => {
    return context.json(await new Book(context.get("deps").database).orders(context.get("userId") ?? ""));
  });

  app.get("/api/admin/syncs", requireAuth, async (context) => {
    return context.json(await new Book(context.get("deps").database).syncs(context.get("userId") ?? ""));
  });

  app.get("/api/admin/share", requireAuth, async (context) => {
    const users = new Users(context.get("deps").database);
    const user = await users.getById(context.get("userId") ?? "");
    if (!user) return context.json({ error: "unauthorized" }, 401);
    return context.json(users.share(user));
  });

  app.put("/api/admin/share", requireAuth, async (context) => {
    const parsed = shareBody.safeParse(await readJson(context));
    if (!parsed.success) return context.json({ error: "invalid_body" }, 400);
    const users = new Users(context.get("deps").database);
    const share = await users.setShare(context.get("userId") ?? "", parsed.data);
    if (!share) return context.json({ error: "unauthorized" }, 401);
    await purgePublic();
    return context.json(share);
  });

  app.get("/api/admin/profile", requireAuth, async (context) => {
    const users = new Users(context.get("deps").database);
    const user = await users.getById(context.get("userId") ?? "");
    if (!user) return context.json({ error: "unauthorized" }, 401);
    return context.json(users.me(user));
  });

  app.patch("/api/admin/profile", requireAuth, async (context) => {
    const parsed = profileBody.safeParse(await readJson(context));
    if (!parsed.success) return context.json({ error: "invalid_body" }, 400);
    const users = new Users(context.get("deps").database);
    const user = await users.updateProfile(context.get("userId") ?? "", parsed.data);
    if (!user) return context.json({ error: "unauthorized" }, 401);
    await purgePublic();
    return context.json(user);
  });
}

export { registerAdminRoutes };
