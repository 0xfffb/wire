import type { Context, Next } from "hono";

import type { Deps } from "../deps";
import { Publishers, type PublisherRecord } from "../services/publishers";

type PublisherEnv = {
  Variables: {
    deps: Deps;
    userId?: string;
    publisher: PublisherRecord;
  };
};

async function requirePublisher(context: Context<PublisherEnv>, next: Next) {
  const userId = context.get("userId");
  if (!userId) return context.json({ error: "unauthorized" }, 401);
  const publishers = new Publishers(context.get("deps").database);
  const record = await publishers.getRecord(userId);
  if (!record || record.status !== "approved") {
    return context.json({ error: "not_publisher" }, 403);
  }
  context.set("publisher", record);
  await next();
}

export { requirePublisher };
export type { PublisherEnv };
