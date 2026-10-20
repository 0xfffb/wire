import { Hono } from "hono";

import type { Deps } from "../deps";
import { registerAuthRoutes } from "./auth";
import { registerUserRoutes } from "./user";

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
    registerAuthRoutes(this.app);
    registerUserRoutes(this.app);
  }
}

export { ApiRouter };
export type { AppEnv };
