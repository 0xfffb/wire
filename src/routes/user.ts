import type { Hono } from "hono";

import { requireAuth, requirePublisher } from "../middleware";
import { patchProfileBody } from "../schemas/auth";
import { applyBody, shareBody } from "../schemas/publisher";
import { PublisherConsole } from "../services/console";
import { Publishers } from "../services/publishers";
import { Users } from "../services/users";
import type { AppEnv } from "./index";

async function readBody(context: { req: { json: () => Promise<unknown> } }) {
  try {
    return await context.req.json();
  } catch {
    return null;
  }
}

function registerUserRoutes(app: Hono<AppEnv>) {
  app.get("/api/user", requireAuth, async (context) => {
    const users = new Users(context.get("deps").database);
    const user = await users.getView(context.get("userId") ?? "");
    if (!user) {
      return context.json({ error: "unauthorized" }, 401);
    }
    return context.json(user);
  });

  app.patch("/api/user/profile", requireAuth, async (context) => {
    const raw = await readBody(context);
    const parsed = patchProfileBody.safeParse(raw);
    if (!parsed.success) {
      return context.json({ error: "invalid_body" }, 400);
    }

    const users = new Users(context.get("deps").database);
    const user = await users.updateProfile(context.get("userId") ?? "", {
      name: parsed.data.name,
      bioZh: parsed.data.bioZh?.trim(),
      bioEn: parsed.data.bioEn?.trim(),
    });
    if (!user) {
      return context.json({ error: "unauthorized" }, 401);
    }
    return context.json(user);
  });

  app.get("/api/user/apply", requireAuth, async (context) => {
    const publishers = new Publishers(context.get("deps").database);
    const record = await publishers.getRecord(context.get("userId") ?? "");
    return context.json({
      status: record?.status ?? "none",
      markets: record?.markets ?? [],
      note: record?.note ?? "",
    });
  });

  app.post("/api/user/apply", requireAuth, async (context) => {
    const parsed = applyBody.safeParse(await readBody(context));
    if (!parsed.success) return context.json({ error: "invalid_body" }, 400);
    const publishers = new Publishers(context.get("deps").database);
    const result = await publishers.apply(context.get("userId") ?? "", {
      markets: parsed.data.markets,
      note: parsed.data.note?.trim() ?? "",
    });
    if ("error" in result) return context.json({ error: result.error }, 409);
    return context.json(result);
  });

  app.post("/api/user/apply/pass", requireAuth, async (context) => {
    const publishers = new Publishers(context.get("deps").database);
    const result = await publishers.approve(context.get("userId") ?? "");
    if ("error" in result) return context.json({ error: result.error }, 404);
    return context.json(result);
  });

  app.get("/api/user/overview", requireAuth, requirePublisher, async (context) => {
    const record = context.get("publisher");
    if (!record) return context.json({ error: "not_publisher" }, 403);
    const console = new PublisherConsole(context.get("deps").database);
    return context.json(await console.overview(context.get("userId") ?? "", record));
  });

  app.get("/api/user/holdings", requireAuth, requirePublisher, async (context) => {
    const console = new PublisherConsole(context.get("deps").database);
    return context.json(await console.holdings(context.get("userId") ?? ""));
  });

  app.get("/api/user/orders", requireAuth, requirePublisher, async (context) => {
    const console = new PublisherConsole(context.get("deps").database);
    return context.json(await console.orders(context.get("userId") ?? ""));
  });

  app.get("/api/user/broker", requireAuth, requirePublisher, async (context) => {
    const console = new PublisherConsole(context.get("deps").database);
    return context.json(await console.broker(context.get("userId") ?? ""));
  });

  app.get("/api/user/share", requireAuth, requirePublisher, async (context) => {
    const record = context.get("publisher");
    if (!record) return context.json({ error: "not_publisher" }, 403);
    const console = new PublisherConsole(context.get("deps").database);
    return context.json(await console.share(record));
  });

  app.put("/api/user/share", requireAuth, requirePublisher, async (context) => {
    const parsed = shareBody.safeParse(await readBody(context));
    if (!parsed.success) return context.json({ error: "invalid_body" }, 400);
    const console = new PublisherConsole(context.get("deps").database);
    return context.json(await console.setShare(context.get("userId") ?? "", parsed.data));
  });
}

export { registerUserRoutes };
