import type { Hono } from "hono";

import { optionalAuth, requireAuth } from "../middleware";
import { Publishers } from "../services/publishers";
import type { AppEnv } from "./index";

function registerPublisherPublicRoutes(app: Hono<AppEnv>) {
  app.get("/api/users", optionalAuth, async (context) => {
    const publishers = new Publishers(context.get("deps").database);
    return context.json({ users: await publishers.listApproved() });
  });

  app.get("/api/users/:handle", optionalAuth, async (context) => {
    const handle = (context.req.param("handle") ?? "").trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(handle)) {
      return context.json({ error: "not_found" }, 404);
    }
    const publishers = new Publishers(context.get("deps").database);
    const home = await publishers.home(handle, context.get("userId"));
    if (!home) return context.json({ error: "not_found" }, 404);
    return context.json(home);
  });

  app.get("/api/subscriptions", requireAuth, async (context) => {
    const publishers = new Publishers(context.get("deps").database);
    return context.json({
      users: await publishers.listMine(context.get("userId") ?? ""),
    });
  });
}

export { registerPublisherPublicRoutes };
