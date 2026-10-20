import { type Context, Hono } from "hono";

import type { Deps } from "../deps";
import type { PublisherRecord } from "../services/publishers";
import { registerAuthRoutes } from "./auth";
import { registerOauthRoutes } from "./oauth";
import { registerPublisherPublicRoutes } from "./publishers";
import { registerUserRoutes } from "./user";

type Bindings = {
  ASSETS?: Fetcher;
};

type AppEnv = {
  Bindings: Bindings;
  Variables: {
    deps: Deps;
    userId?: string;
    publisher?: PublisherRecord;
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
    registerPublisherPublicRoutes(this.app);
    registerOauthRoutes(this.app);
    this.app.get("/users/:handle/sub", (c) => serveUserShell(c, true));
    this.app.get("/users/:handle", (c) => serveUserShell(c, false));
  }
}

async function serveUserShell(context: Context<AppEnv>, sub: boolean) {
  const assets = context.env.ASSETS;
  if (!assets) return context.notFound();
  const url = new URL(context.req.url);
  url.pathname = sub ? "/users/_/sub/" : "/users/_/";
  return assets.fetch(new Request(url, context.req.raw));
}

export { ApiRouter };
export type { AppEnv, Bindings };
