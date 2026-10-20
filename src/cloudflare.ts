import { FutuBrokerage } from "./brokerage/futu";
import { JobConsumer } from "./jobs/consumer";
import { ApiRouter } from "./routes";
import { Brokers } from "./services/brokers";
import { CloudflareSqlDatabase } from "./storage/database/cloudflare";
import { CloudflareKvStore } from "./storage/kv/cloudflare";
import type { QueueMessage } from "./storage/queue";
import { CloudflareQueue } from "./storage/queue/cloudflare";

const CRON_REFRESH = "*/31 * * * *";
const CRON_DAILY_SYNC = "0 8 * * *";

type CloudflareEnv = {
  DB: D1Database;
  KV: KVNamespace;
  QUEUE: Queue<QueueMessage>;
  ASSETS: Fetcher;
};

function depsFrom(env: CloudflareEnv) {
  return {
    database: new CloudflareSqlDatabase(env.DB),
    kv: new CloudflareKvStore(env.KV),
    queue: new CloudflareQueue(env.QUEUE),
    brokerage: {
      futu: new FutuBrokerage(),
    },
  };
}

function fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
  return new ApiRouter(depsFrom(env)).app.fetch(request, env, ctx);
}

async function scheduled(controller: ScheduledController, env: CloudflareEnv, _ctx: ExecutionContext) {
  const deps = depsFrom(env);
  const brokers = Brokers.from(deps);
  if (controller.cron === CRON_DAILY_SYNC) {
    await brokers.enqueueAllSync(deps.queue);
    return;
  }
  if (controller.cron === CRON_REFRESH) {
    await brokers.enqueueDue(deps.queue);
  }
}

async function queue(batch: MessageBatch<QueueMessage>, env: CloudflareEnv) {
  const consumer = new JobConsumer(depsFrom(env));
  for (const message of batch.messages) {
    await consumer.consume(message.body);
    message.ack();
  }
}

export default { fetch, scheduled, queue };
