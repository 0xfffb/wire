import { Hono, type Context } from "hono";
import { getCookie } from "hono/cookie";

import type { Deps } from "../deps";
import { cachePublic, loadSession, noStore, SESSION_COOKIE } from "../middleware";
import { Book } from "../services/book";
import { registerAdminRoutes } from "./admin";
import { registerAuthRoutes } from "./auth";
import { registerOauthRoutes } from "./oauth";

type Bindings = {
  ASSETS?: Fetcher;
};

type AppEnv = {
  Bindings: Bindings;
  Variables: {
    deps: Deps;
    userId?: string;
  };
};

class ApiRouter {
  public app: Hono<AppEnv>;

  constructor(readonly deps: Deps) {
    this.app = new Hono<AppEnv>({ strict: false });
    this.app.use("*", async (c, next) => {
      c.set("deps", deps);
      await next();
    });
    this.app.use("/api/*", cachePublic);
    this.app.use("/api/admin/*", noStore);
    this.app.use("/api/me", noStore);
    this.app.use("/api/auth/*", noStore);
    this.app.get("/api/health", (c) => c.json({ ok: true }));
    this.app.get("/api/book", async (c) => c.json(await new Book(deps.database).public()));
    registerAuthRoutes(this.app);
    registerAdminRoutes(this.app);
    registerOauthRoutes(this.app);
    registerPageRoutes(this.app);
  }
}

function registerPageRoutes(app: Hono<AppEnv>) {
  const pages = async (context: Context<AppEnv>) => {
    const path = new URL(context.req.url).pathname;
    const session = await loadSession(context.get("deps").kv, getCookie(context, SESSION_COOKIE));
    if (path.startsWith("/login") && session) return context.redirect("/admin");
    if (path.startsWith("/admin") && !session) return context.redirect("/login");
    if (!context.env.ASSETS) return context.body(null, 404);
    return context.env.ASSETS.fetch(context.req.raw);
  };
  app.get("/login", pages);
  app.get("/login/", pages);
  app.get("/admin", pages);
  app.get("/admin/*", pages);
}

export { ApiRouter };
export type { AppEnv, Bindings };
