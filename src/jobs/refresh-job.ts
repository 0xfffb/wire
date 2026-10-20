import type { Deps } from "../deps";
import { Brokers } from "../services/brokers";
import { Job } from "./job";

class RefreshJob extends Job {
  constructor(deps: Deps) {
    super(deps);
  }

  async execute(payload: unknown) {
    const userId = payload && typeof payload === "object" && "userId" in payload ? payload.userId : null;
    if (typeof userId !== "string" || !userId) return;
    await Brokers.from(this.deps).refresh(userId);
    await Brokers.from(this.deps).enqueueSync(this.deps.queue, userId);
  }
}

export { RefreshJob };
