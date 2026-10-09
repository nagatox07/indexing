import { Hono } from "hono";
import { and, count, desc, eq, sql } from "ponder";
import { db } from "ponder:api";
import schema from "ponder:schema";

import { jsonSafe, readInt } from "../lib/http.js";

/**
 * Records REST endpoints (read-only).
 *
 *   GET /api/records?limit=&offset=&owner=&includeDeleted=
 *   GET /api/records/:id
 *   GET /api/records/:id/events
 */
export const recordRoutes = new Hono();

recordRoutes.get("/", async (c) => {
  const limit = readInt(c.req.query("limit"), 25, 100);
  const offset = readInt(c.req.query("offset"), 0, 100_000);
  const owner = c.req.query("owner")?.toLowerCase();
  const includeDeleted = c.req.query("includeDeleted") === "true";

  const conditions = [];
  if (owner && owner.startsWith("0x")) {
    conditions.push(sql`${schema.record.owner} = ${owner}`);
  }
  if (!includeDeleted) {
    conditions.push(sql`${schema.record.isDeleted} = false`);
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, total] = await Promise.all([
    db
      .select()
      .from(schema.record)
      .where(where)
      .orderBy(desc(schema.record.updatedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(schema.record)
      .where(where)
      .then((result) => Number(result[0]?.value ?? 0)),
  ]);

  return c.json(
    jsonSafe({
      data: rows,
      meta: { limit, offset, total, count: rows.length },
    }),
  );
});

recordRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  if (!/^\d+$/.test(id)) {
    return c.json({ error: "invalid_id", message: "Record id must be a positive integer." }, 400);
  }

  const rows = await db
    .select()
    .from(schema.record)
    .where(eq(schema.record.id, BigInt(id)));

  const row = rows[0];
  if (row === undefined) {
    return c.json({ error: "not_found", message: `No record with id ${id}.` }, 404);
  }

  return c.json(jsonSafe({ data: row }));
});

recordRoutes.get("/:id/events", async (c) => {
  const id = c.req.param("id");
  if (!/^\d+$/.test(id)) {
    return c.json({ error: "invalid_id", message: "Record id must be a positive integer." }, 400);
  }

  const limit = readInt(c.req.query("limit"), 50, 200);
  const offset = readInt(c.req.query("offset"), 0, 100_000);

  const where = eq(schema.recordEvent.recordId, BigInt(id));
  const [rows, total] = await Promise.all([
    db
      .select()
      .from(schema.recordEvent)
      .where(where)
      .orderBy(desc(schema.recordEvent.blockNumber))
      .limit(limit)
      .offset(offset),
    db
      .select({ value: count() })
      .from(schema.recordEvent)
      .where(where)
      .then((result) => Number(result[0]?.value ?? 0)),
  ]);

  return c.json(
    jsonSafe({
      data: rows,
      meta: { limit, offset, total, count: rows.length, recordId: id },
    }),
  );
});
