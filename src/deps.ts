import type { SqlDatabase } from "./storage/database";
import type { KvStore } from "./storage/kv";

interface Deps {
  database: SqlDatabase;
  kv: KvStore;
  tokenKey: string;
}

export type { Deps };
