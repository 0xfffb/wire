import { FutuBrokerage } from "./brokerage/futu";
import { JobConsumer } from "./jobs/consumer";
import { ApiRouter } from "./routes";
import { CloudflareSqlDatabase } from "./storage/database/cloudflare";
import { CloudflareKvStore } from "./storage/kv/cloudflare";
import type { QueueMessage } from "./storage/queue";
import { CloudflareQueue } from "./storage/queue/cloudflare";

type CloudflareEnv = {
  DB: D1Database;
  KV: KVNamespace;
  QUEUE: Queue<QueueMessage>;
  ASSETS: Fetcher;
};

function fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
  const app = new ApiRouter({
    database: new CloudflareSqlDatabase(env.DB),
    kv: new CloudflareKvStore(env.KV),
    queue: new CloudflareQueue(env.QUEUE),
    brokerage: {
      futu: new FutuBrokerage(),
    },
  }).app;

  return app.fetch(request, env, ctx);
}

async function scheduled(controller: ScheduledController, env: CloudflareEnv, _ctx: ExecutionContext) {
  const deps = {
    database: new CloudflareSqlDatabase(env.DB),
    kv: new CloudflareKvStore(env.KV),
    queue: new CloudflareQueue(env.QUEUE),
    brokerage: {
      futu: new FutuBrokerage(),
    },
  };
  await deps.queue.send({
    type: "example",
    payload: {
      cron: controller.cron,
      timestamp: new Date().toISOString(),
    },
  });
}

async function queue(batch: MessageBatch<QueueMessage>, env: CloudflareEnv) {
  const deps = {
    database: new CloudflareSqlDatabase(env.DB),
    kv: new CloudflareKvStore(env.KV),
    queue: new CloudflareQueue(env.QUEUE),
    brokerage: {
      futu: new FutuBrokerage(),
    },
  };

  const consumer = new JobConsumer(deps);
  for (const message of batch.messages) {
    await consumer.consume(message.body);
    message.ack();
  }
}

export default { fetch, scheduled, queue };
