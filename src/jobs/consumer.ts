import type { Deps } from "../deps";
import type { Job } from "./index";
import { ExampleJob } from "./example";
import type { QueueMessage } from "../storage/queue";

class JobConsumer {
    private jobs: Record<string, Job>
  
    constructor(readonly deps: Deps) {
      this.jobs = {
          example: new ExampleJob(this.deps),
      }
    }
  
    async consume(message: QueueMessage) {
      switch (message.type) {
          case "example":
              await this.jobs[message.type]?.execute(message.payload);
              break;
          default:
              throw new Error(`Unknown job type: ${message.type}`);
      }
    }
  }
  
export { JobConsumer };