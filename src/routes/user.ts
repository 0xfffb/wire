import type { Hono } from "hono";

import { requireAuth } from "../middleware";
import { patchProfileBody } from "../schemas/auth";
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
}

export { registerUserRoutes };
