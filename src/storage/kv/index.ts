abstract class KvStore {
  abstract get(key: string): Promise<string | null>;
  abstract put(key: string, value: string, options?: { ttlSec?: number }): Promise<void>;
  abstract delete(key: string): Promise<void>;
}

export { KvStore };
