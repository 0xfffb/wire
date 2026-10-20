import { Hono } from "hono";

import type { Deps } from "../deps";
import { requireAuth } from "../middleware";

type AppEnv = {
  Variables: {
    deps: Deps;
    userId?: string;
  };
};

class ApiRouter {
  public app: Hono<AppEnv>;

  constructor(readonly deps: Deps) {
    this.app = new Hono<AppEnv>();
    this.app.use("*", async (c, next) => {
      c.set("deps", deps);
      await next();
    });
    this.registerRoutes();
  }

  private registerRoutes() {
    this.app.get("/api/health", (c) => c.json({ ok: true }));

    // 需登录：Cookie wire_session → KV session:{token}
    this.app.get("/api/me", requireAuth, (c) => {
      return c.json({ userId: c.get("userId") });
    });
  }
}

export { ApiRouter };
export type { AppEnv };
