type KvListKey = {
  name: string;
  metadata?: unknown;
};

type KvListPage = {
  keys: KvListKey[];
  cursor?: string;
};

type KvPutOptions = {
  ttlSec?: number;
  metadata?: unknown;
};

abstract class KvStore {
  abstract get(key: string): Promise<string | null>;
  abstract put(key: string, value: string, options?: KvPutOptions): Promise<void>;
  abstract delete(key: string): Promise<void>;
  abstract list(options: { prefix: string; cursor?: string; limit?: number }): Promise<KvListPage>;
}

export { KvStore };
export type { KvListKey, KvListPage, KvPutOptions };
