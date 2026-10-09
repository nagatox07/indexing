import { Hono } from "hono";

import { readUsage } from "../lib/db.js";
import { readInt } from "../lib/http.js";

/**
 * API usage log (read-only).
 *
 *   GET /api/usage?limit=
 *
 * Shows the requests this API has served, which the dashboard renders as a
 * live feed to demonstrate API-key auth + usage logging.
 */
export const usageRoutes = new Hono();

usageRoutes.get("/", async (c) => {
  const limit = readInt(c.req.query("limit"), 50, 200);

  try {
    const rows = await readUsage(limit);
    return c.json({ data: rows, meta: { limit, count: rows.length } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return c.json(
      { error: "usage_log_unavailable", message, data: [], meta: { limit, count: 0 } },
      503,
    );
  }
});
