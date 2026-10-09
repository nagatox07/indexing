import { Hono } from "hono";
import { count, eq, sql } from "ponder";
import { db } from "ponder:api";
import schema from "ponder:schema";

import { jsonSafe } from "../lib/http.js";

/** Aggregates for the dashboard's stat tiles. */
export const statsRoutes = new Hono();

statsRoutes.get("/", async (c) => {
  const [records, activeRecords, events, created, updated, deleted, transfers, uniqueOwners] =
    await Promise.all([
      db.select({ value: count() }).from(schema.record),
      db
        .select({ value: count() })
        .from(schema.record)
        .where(eq(schema.record.isDeleted, false)),
      db.select({ value: count() }).from(schema.recordEvent),
      db
        .select({ value: count() })
        .from(schema.recordEvent)
        .where(eq(schema.recordEvent.action, "created")),
      db
        .select({ value: count() })
        .from(schema.recordEvent)
        .where(eq(schema.recordEvent.action, "updated")),
      db
        .select({ value: count() })
        .from(schema.recordEvent)
        .where(eq(schema.recordEvent.action, "deleted")),
      db.select({ value: count() }).from(schema.tokenTransfer),
      db
        .select({ owners: sql<number>`count(distinct ${schema.record.owner})` })
        .from(schema.record),
    ]);

  const n = (rows: Array<{ value: number }>) => Number(rows[0]?.value ?? 0);

  return c.json(
    jsonSafe({
      data: {
        records: {
          total: n(records),
          active: n(activeRecords),
          deleted: n(records) - n(activeRecords),
          uniqueOwners: Number(uniqueOwners[0]?.owners ?? 0),
        },
        events: { total: n(events), created: n(created), updated: n(updated), deleted: n(deleted) },
        transfers: { total: n(transfers) },
      },
      generatedAt: new Date().toISOString(),
    }),
  );
});
