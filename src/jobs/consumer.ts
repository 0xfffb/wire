import type { Deps } from "../deps";
import { ExampleJob } from "./example";
import type { Job } from "./job";
import { RefreshJob } from "./refresh-job";
import { SyncJob } from "./sync-job";
import type { QueueMessage } from "../storage/queue";

class JobConsumer {
  private jobs: Record<string, Job>;

  constructor(readonly deps: Deps) {
    this.jobs = {
      example: new ExampleJob(this.deps),
      refresh: new RefreshJob(this.deps),
      sync: new SyncJob(this.deps),
    };
  }

  async consume(message: QueueMessage) {
    const job = this.jobs[message.type];
    if (!job) throw new Error(`Unknown job type: ${message.type}`);
    await job.execute(message.payload);
  }
}
  
export { JobConsumer };