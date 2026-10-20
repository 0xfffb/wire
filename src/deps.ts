import type { Brokerage } from "./brokerage";
import type { SqlDatabase } from "./storage/database";
import type { KvStore } from "./storage/kv";
import type { Queue } from "./storage/queue";

interface Deps {
  database: SqlDatabase;
  kv: KvStore;
  queue: Queue;
  brokerage: Record<string, Brokerage>;
}

export type { Deps };
