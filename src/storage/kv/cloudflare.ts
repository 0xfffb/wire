import { KvStore } from "./index";

class CloudflareKvStore extends KvStore {
  constructor(private readonly namespace: KVNamespace) {
    super();
  }

  get(key: string) {
    return this.namespace.get(key, "text");
  }

  put(key: string, value: string, options?: { ttlSec?: number }) {
    const expirationTtl = options?.ttlSec;
    if (expirationTtl != null && expirationTtl < 60) {
      // Workers KV expirationTtl 最小 60 秒
      throw new Error("KvStore.put ttlSec must be >= 60 on Cloudflare");
    }
    return this.namespace.put(
      key,
      value,
      expirationTtl != null ? { expirationTtl } : undefined,
    );
  }

  delete(key: string) {
    return this.namespace.delete(key);
  }
}

export { CloudflareKvStore };
