import type { Hono } from "hono";

import { SnaptradeError } from "../brokerage/snaptrade";
import { optionalAuth } from "../middleware";
import { Connect } from "../services/connect";
import type { AppEnv } from "./index";

function registerOauthRoutes(app: Hono<AppEnv>) {
  app.get("/oauth/snaptrade/callback", optionalAuth, async (context) => {
    const origin = new URL(context.req.url).origin;
    const userId = context.get("userId");
    if (!userId) return context.redirect(`${origin}/login`);
    const error = context.req.query("error");
    if (error) return context.redirect(`${origin}/admin/connect?error=${encodeURIComponent(error)}`);
    try {
      await Connect.from(context.get("deps")).finish(userId);
      return context.redirect(`${origin}/admin/connect`);
    } catch (caught) {
      const code = caught instanceof SnaptradeError ? caught.code : "snaptrade_unavailable";
      return context.redirect(`${origin}/admin/connect?error=${encodeURIComponent(code)}`);
    }
  });
}

export { registerOauthRoutes };
