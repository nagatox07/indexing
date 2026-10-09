import { createMiddleware } from "hono/factory";

import { recordUsage } from "../lib/db.js";

/**
 * Usage logging middleware.
 *
 * Records every request that reaches it (status, latency, masked API key,
 * client) into Postgres, then exposes the timings to downstream handlers so
 * the logged latency includes response generation.
 *
 * Logs are written fire-and-forget: a Postgres failure never fails a request.
 */
export const usageMiddleware = createMiddleware(async (c, next) => {
  const started = Date.now();
  await next();

  const status = c.res.status;
  const durationMs = Date.now() - started;

  void recordUsage({
    apiKeyMask: c.get("apiKeyMask") ?? "anonymous",
    method: c.req.method,
    path: c.req.path,
    status,
    durationMs,
    ip:
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
      c.req.header("cf-connecting-ip") ??
      null,
    userAgent: c.req.header("user-agent") ?? null,
  });
});
