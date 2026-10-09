import "dotenv/config";

import pg from "pg";

/**
 * Writable Postgres pool used by the REST API.
 *
 * Ponder exposes `db` from `ponder:api`, but that handle is intentionally
 * read-only (indexing functions own all writes to the onchain tables).
 * API usage logs are application data, so they get their own pool/table.
 */

let pool: pg.Pool | undefined;
let usageTableReady: Promise<void> | undefined;

export function getPool(): pg.Pool {
  if (pool === undefined) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      // Usage logging must never take the API down if Postgres hiccups.
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    });
    pool.on("error", (error) => {
      console.error("[chainindex] idle postgres client error:", error.message);
    });
  }
  return pool;
}

/** Creates the usage-log table once per process. Idempotent. */
export function ensureUsageTable(): Promise<void> {
  usageTableReady ??= getPool()
    .query(
      `CREATE TABLE IF NOT EXISTS api_usage (
         id           BIGSERIAL PRIMARY KEY,
         api_key_mask TEXT        NOT NULL,
         method       TEXT        NOT NULL,
         path         TEXT        NOT NULL,
         status       INTEGER     NOT NULL,
         duration_ms  INTEGER     NOT NULL,
         ip           TEXT,
         user_agent   TEXT,
         created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
       )`,
    )
    .then(() => undefined)
    .catch((error: unknown) => {
      // Reset so the next request retries instead of caching the failure.
      usageTableReady = undefined;
      throw error;
    });
  return usageTableReady;
}

export type UsageRow = {
  apiKeyMask: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  ip: string | null;
  userAgent: string | null;
};

/**
 * Best-effort usage logging. Never throws - callers should not await this
 * in a way that can fail the HTTP response.
 */
export async function recordUsage(row: UsageRow): Promise<void> {
  try {
    await ensureUsageTable();
    await getPool().query(
      `INSERT INTO api_usage
         (api_key_mask, method, path, status, duration_ms, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        row.apiKeyMask,
        row.method,
        row.path,
        row.status,
        row.durationMs,
        row.ip,
        row.userAgent,
      ],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[chainindex] failed to record API usage:", message);
  }
}

/** Reads back the usage log for the dashboard's "Usage" panel. */
export async function readUsage(limit: number): Promise<
  Array<{
    id: string;
    apiKeyMask: string;
    method: string;
    path: string;
    status: number;
    durationMs: number;
    ip: string | null;
    createdAt: string;
  }>
> {
  await ensureUsageTable();
  const result = await getPool().query(
    `SELECT id::text            AS id,
            api_key_mask        AS "apiKeyMask",
            method,
            path,
            status,
            duration_ms         AS "durationMs",
            ip,
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MSOF') AS "createdAt"
       FROM api_usage
      ORDER BY id DESC
      LIMIT $1`,
    [limit],
  );
  return result.rows;
}

/** Cheap liveness probe for the health endpoint. */
export async function pingDatabase(): Promise<number> {
  const started = Date.now();
  await getPool().query("SELECT 1");
  return Date.now() - started;
}
