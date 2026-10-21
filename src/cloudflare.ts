import { ApiRouter } from "./routes";
import { HoldingsSync } from "./services/sync";
import { CloudflareSqlDatabase } from "./storage/database/cloudflare";
import { CloudflareKvStore } from "./storage/kv/cloudflare";

const CRON_DAILY_SYNC = "0 8 * * *";

type CloudflareEnv = {
  DB: D1Database;
  KV: KVNamespace;
  ASSETS: Fetcher;
  TOKEN_ENC_KEY?: string;
};

function depsFrom(env: CloudflareEnv) {
  return {
    database: new CloudflareSqlDatabase(env.DB),
    kv: new CloudflareKvStore(env.KV),
    tokenKey: env.TOKEN_ENC_KEY?.trim() ?? "",
  };
}

function fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
  return new ApiRouter(depsFrom(env)).app.fetch(request, env, ctx);
}

async function scheduled(controller: ScheduledController, env: CloudflareEnv, _ctx: ExecutionContext) {
  if (controller.cron !== CRON_DAILY_SYNC) return;
  await HoldingsSync.from(depsFrom(env)).runAll();
}

export default { fetch, scheduled };
