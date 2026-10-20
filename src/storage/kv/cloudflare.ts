import { KvStore } from "./index";

class CloudflareKvStore extends KvStore {
  constructor(private readonly namespace: KVNamespace) {
    super();
  }

  get(key: string) {
    return this.namespace.get(key, "text");
  }

  put(key: string, value: string, options?: { ttlSec?: number; metadata?: unknown }) {
    const expirationTtl = options?.ttlSec;
    if (expirationTtl != null && expirationTtl < 60) {
      // Workers KV expirationTtl 最小 60 秒
      throw new Error("KvStore.put ttlSec must be >= 60 on Cloudflare");
    }
    return this.namespace.put(key, value, {
      ...(expirationTtl != null ? { expirationTtl } : {}),
      ...(options?.metadata !== undefined ? { metadata: options.metadata } : {}),
    });
  }

  delete(key: string) {
    return this.namespace.delete(key);
  }

  async list(options: { prefix: string; cursor?: string; limit?: number }) {
    const page = await this.namespace.list({
      prefix: options.prefix,
      cursor: options.cursor,
      limit: options.limit,
    });
    return {
      keys: page.keys.map((item) => ({ name: item.name, metadata: item.metadata })),
      cursor: page.list_complete ? undefined : page.cursor,
    };
  }
}

export { CloudflareKvStore };
