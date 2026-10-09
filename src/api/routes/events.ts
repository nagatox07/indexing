import { Hono } from "hono";
import { count, desc, eq, sql } from "ponder";
import { db } from "ponder:api";
import schema from "ponder:schema";

import { jsonSafe, readInt } from "../lib/http.js";

/**
 * Activity feed REST endpoints (read-only).
 *
 *   GET /api/events?limit=&offset=&action=&recordId=
 *   GET /api/transfers?limit=&offset=&address=
 */
export const eventRoutes = new Hono();

const ACTIONS = new Set(["created", "updated", "deleted"]);

eventRoutes.get("/", async (c) => {
  const limit = readInt(c.req.query("limit"), 25, 100);
  const offset = readInt(c.req.query("offset"), 0, 100_000);
  const action = c.req.query("action");
  const recordId = c.req.query("recordId");

  const conditions = [];
  if (action !== undefined && ACTIONS.has(action)) {
    conditions.push(eq(schema.recordEvent.action, action));
  }
  if (recordId !== undefined && /^\d+$/.test(recordId)) {
    conditions.push(eq(schema.recordEvent.recordId, BigInt(recordId)));
  }
  const where = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

  const [rows, total] = await Promise.all([
    db
      .select()
      .from(schema.recordEvent)
      .where(where)
      .orderBy(desc(schema.recordEvent.blockNumber), desc(schema.recordEvent.logIndex))
      .limit(limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(schema.recordEvent)
      .where(where)
      .then((result) => Number(result[0]?.value ?? 0)),
  ]);

  return c.json(
    jsonSafe({ data: rows, meta: { limit, offset, total, count: rows.length } }),
  );
});

const transferRoutes = new Hono();

transferRoutes.get("/", async (c) => {
  const limit = readInt(c.req.query("limit"), 25, 100);
  const offset = readInt(c.req.query("offset"), 0, 100_000);
  const address = c.req.query("address")?.toLowerCase();

  const where =
    address !== undefined && address.startsWith("0x")
      ? sql`(lower(${schema.tokenTransfer.fromAddress}) = ${address} OR lower(${schema.tokenTransfer.toAddress}) = ${address})`
      : undefined;

  const [rows, total] = await Promise.all([
    db
      .select()
      .from(schema.tokenTransfer)
      .where(where)
      .orderBy(desc(schema.tokenTransfer.blockNumber), desc(schema.tokenTransfer.logIndex))
      .limit(limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(schema.tokenTransfer)
      .where(where)
      .then((result) => Number(result[0]?.value ?? 0)),
  ]);

  return c.json(
    jsonSafe({ data: rows, meta: { limit, offset, total, count: rows.length } }),
  );
});

export { transferRoutes };
