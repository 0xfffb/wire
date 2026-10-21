import type { MiddlewareHandler } from "hono";

const TTL: Record<string, number> = {
  "/api/book": 60,
  "/api/setup": 60,
  "/api/health": 30,
};

function cacheKey(path: string) {
  return new Request(`https://wire.cache${path}`, { method: "GET" });
}

function pathname(url: string) {
  const path = new URL(url).pathname;
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

const cachePublic: MiddlewareHandler = async (context, next) => {
  if (context.req.method !== "GET") return next();
  const path = pathname(context.req.url);
  const ttl = TTL[path];
  if (ttl == null) return next();

  const key = cacheKey(path);
  const hit = await caches.default.match(key);
  if (hit) {
    const headers = new Headers(hit.headers);
    headers.set("X-Cache", "HIT");
    return new Response(hit.body, { status: hit.status, headers });
  }

  await next();
  if (context.res.status !== 200) return;
  context.header("Cache-Control", `public, max-age=${ttl}`);
  context.header("X-Cache", "MISS");
  context.executionCtx.waitUntil(caches.default.put(key, context.res.clone()));
};

const noStore: MiddlewareHandler = async (context, next) => {
  await next();
  context.header("Cache-Control", "private, no-store");
};

async function purgeApiCache(...paths: string[]) {
  await Promise.all(paths.map((path) => caches.default.delete(cacheKey(path))));
}

function purgePublic(ctx?: { waitUntil(promise: Promise<unknown>): void }) {
  const work = purgeApiCache("/api/book", "/api/setup");
  if (ctx) ctx.waitUntil(work);
  else return work;
}

export { cachePublic, noStore, purgeApiCache, purgePublic };
