import { Hono } from "hono";
import { decodeCheckpoint } from "ponder";

import { getPool, pingDatabase } from "../lib/db.js";

/**
 * Health checks.
 *
 * - GET /api/health -> cheap liveness + DB reachability (public)
 * - GET /api/ready  -> readiness: DB reachable AND Ponder reports ready
 *
 * Both are intentionally unauthenticated so uptime probes and the dashboard
 * can poll them before any API key is entered.
 */
export const healthRoutes = new Hono();
export const readyRoutes = new Hono();

const startedAt = Date.now();

type MetaRow = { value: unknown };

healthRoutes.get("/", async (c) => {
  let database: "up" | "down" = "down";
  let latencyMs = -1;
  let dbError: string | null = null;

  try {
    latencyMs = await pingDatabase();
    database = "up";
  } catch (error) {
    dbError = error instanceof Error ? error.message : String(error);
  }

  return c.json(
    {
      status: database === "up" ? "ok" : "degraded",
      service: "chainindex-api",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      checks: {
        database: { status: database, latencyMs, error: dbError },
        rpc: {
          status: process.env.SEPOLIA_RPC_URL ? "configured" : "missing",
        },
        contracts: {
          dataRegistry: process.env.DATA_REGISTRY_ADDRESS ?? null,
          demoToken: process.env.DEMO_TOKEN_ADDRESS ?? null,
        },
      },
    },
    database === "up" ? 200 : 503,
  );
});

readyRoutes.get("/", async (c) => {
  let database: "up" | "down" = "down";
  let indexerReady: boolean | null = null;
  let blockNumber: string | null = null;

  try {
    await pingDatabase();
    database = "up";
  } catch {
    database = "down";
  }

  if (database === "up") {
    try {
      const pool = getPool();

      // `_ponder_meta` stores the app row as JSON (`is_ready` is 0/1, not a boolean).
      const meta = await pool.query<MetaRow>(
        "SELECT value FROM public._ponder_meta WHERE key = 'app'",
      );
      const parsed = meta.rows[0]?.value as
        | { is_ready?: number | boolean }
        | undefined;
      indexerReady = Boolean(parsed?.is_ready);

      // `_ponder_checkpoint` stores superjson-encoded checkpoints per chain.
      const checkpoint = await pool.query<{ latest_checkpoint: string }>(
        "SELECT latest_checkpoint FROM public._ponder_checkpoint WHERE chain_id = $1",
        [11155111],
      );
      const encoded = checkpoint.rows[0]?.latest_checkpoint;
      if (encoded !== undefined) {
        blockNumber = String(decodeCheckpoint(encoded).blockNumber);
      }
    } catch {
      indexerReady = false;
    }
  }

  const ready = database === "up" && indexerReady === true;

  return c.json(
    {
      status: ready ? "ready" : "starting",
      database,
      indexerReady,
      chainId: 11155111,
      latestIndexedBlock: blockNumber,
      timestamp: new Date().toISOString(),
    },
    ready ? 200 : 503,
  );
});
