import type { Deps } from "../deps";
import { Brokers } from "../services/brokers";
import { HoldingsSync } from "../services/sync";
import { Job } from "./job";

class SyncJob extends Job {
  constructor(deps: Deps) {
    super(deps);
  }

  async execute(payload: unknown) {
    const userId = payload && typeof payload === "object" && "userId" in payload ? payload.userId : null;
    const accountId =
      payload && typeof payload === "object" && "accountId" in payload ? payload.accountId : null;
    if (typeof userId !== "string" || !userId || typeof accountId !== "string" || !accountId) return;
    const token = await Brokers.from(this.deps).accessToken(userId);
    if (!token) return;
    await HoldingsSync.from(this.deps).runAccount(userId, accountId);
  }
}

export { SyncJob };
