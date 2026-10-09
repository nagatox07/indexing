import "dotenv/config";

import { Hono } from "hono";
import { graphql } from "ponder";
import { db } from "ponder:api";
import schema from "ponder:schema";

import { authMiddleware } from "./middleware/auth.js";
import { usageMiddleware } from "./middleware/usage.js";
import { eventRoutes, transferRoutes } from "./routes/events.js";
import { healthRoutes, readyRoutes } from "./routes/health.js";
import { recordRoutes } from "./routes/records.js";
import { statsRoutes } from "./routes/stats.js";
import { usageRoutes } from "./routes/usage.js";

/**
 * ChainIndex API layer (Ponder `api/index.ts` entrypoint).
 *
 * Ponder mounts this Hono app at `/` on the same server as its built-in
 * `/health`, `/ready`, `/status` and `/metrics` endpoints.
 *
 * Route order matters: everything public is registered before the auth
 * middleware, so it is reachable without an API key.
 */

const app = new Hono();

// --- Public -----------------------------------------------------------------
app.route("/api/health", healthRoutes);
app.route("/api/ready", readyRoutes);

// --- Authenticated ----------------------------------------------------------
// Usage logging wraps auth so 401s are logged too (the key mask is filled in
// by auth on the way down).
app.use("/api/*", usageMiddleware);
app.use("/api/*", authMiddleware);

app.use("/graphql", usageMiddleware);
app.use("/graphql", authMiddleware);

// Ponder's GraphQL over the indexing schema (GraphiQL at /graphql in dev).
app.all("/graphql", graphql({ db, schema }));

// REST surface over the same tables.
app.route("/api/records", recordRoutes);
app.route("/api/events", eventRoutes);
app.route("/api/transfers", transferRoutes);
app.route("/api/stats", statsRoutes);
app.route("/api/usage", usageRoutes);

app.get("/", (c) =>
  c.json({
    name: "chainindex-api",
    version: "0.1.0",
    network: { name: "ethereum-sepolia", chainId: 11155111 },
    graphql: "/graphql",
    health: "/api/health",
    readiness: "/api/ready",
    endpoints: [
      { method: "GET", path: "/api/health", auth: false },
      { method: "GET", path: "/api/records", auth: true },
      { method: "GET", path: "/api/records/:id", auth: true },
      { method: "GET", path: "/api/records/:id/events", auth: true },
      { method: "GET", path: "/api/events", auth: true },
      { method: "GET", path: "/api/transfers", auth: true },
      { method: "GET", path: "/api/stats", auth: true },
      { method: "GET", path: "/api/usage", auth: true },
      { method: "GET", path: "/graphql", auth: true },
    ],
    auth: {
      header: "x-api-key",
      alt: ["Authorization: Bearer <key>", "?apiKey=<key>"],
    },
  }),
);

// Catches unknown /api/* paths so clients always get JSON, not a plain-text 404.
app.all("/api/*", (c) =>
  c.json(
    { error: "not_found", message: `No route for ${c.req.method} ${c.req.path}.` },
    404,
  ),
);

app.notFound((c) =>
  c.json({ error: "not_found", message: `No route for ${c.req.method} ${c.req.path}.` }, 404),
);

export default app;
