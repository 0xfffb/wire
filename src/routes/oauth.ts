import type { Hono } from "hono";

import { optionalAuth } from "../middleware";
import { Brokers } from "../services/brokers";
import { HoldingsSync } from "../services/sync";
import type { AppEnv } from "./index";

function brokerUrl(origin: string, error?: string) {
  const url = new URL("/user/broker", origin);
  if (error) url.searchParams.set("error", error);
  return url.toString();
}

function registerOauthRoutes(app: Hono<AppEnv>) {
  app.get("/oauth/futu/callback", optionalAuth, async (context) => {
    const origin = new URL(context.req.url).origin;
    const query = context.req.query();
    const result = await Brokers.from(context.get("deps")).finish({
      code: query.code,
      state: query.state,
      error: query.error,
      userId: context.get("userId"),
    });
    if ("error" in result) {
      if (result.error === "unauthorized") {
        return context.redirect(`${origin}/login`);
      }
      return context.redirect(brokerUrl(origin, result.error));
    }
    const deps = context.get("deps");
    const userId = context.get("userId") ?? "";
    const brokers = Brokers.from(deps);
    await brokers.includeAllIfNone(userId);
    try {
      await HoldingsSync.from(deps).runUser(userId);
    } catch {
      return context.redirect(brokerUrl(origin, "sync_failed"));
    }
    return context.redirect(brokerUrl(origin));
  });
}

export { registerOauthRoutes };
