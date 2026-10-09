#!/usr/bin/env node
/**
 * End-to-end smoke test for the ChainIndex API.
 *
 * Start the indexer first (`npm run dev`), then run `npm run smoke`.
 * Verifies the public health endpoints, API-key authentication (missing /
 * invalid / valid), every REST route, and the GraphQL endpoint.
 *
 * Exits non-zero if any check fails.
 */
import "dotenv/config";

const port = Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 42069;
const base = (process.env.API_BASE_URL ?? `http://127.0.0.1:${port}`).replace(/\/+$/, "");
const apiKey = (process.env.API_KEYS ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean)[0];

let failures = 0;

async function check(name, path, { method = "GET", key, body, expect }) {
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(key !== undefined ? { "x-api-key": key } : {}),
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    console.log(`FAIL  ${name} — ${error.message}`);
    failures += 1;
    return null;
  }

  const text = await response.text();
  let parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }

  const ok = response.status === expect;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — HTTP ${response.status} (expected ${expect})`);
  if (!ok) {
    failures += 1;
    console.log(`      body: ${text.slice(0, 200)}`);
  }

  return parsed;
}

console.log(`ChainIndex API smoke test against ${base}\n`);

if (apiKey === undefined) {
  console.log("FAIL  API_KEYS is not set in .env — cannot test authenticated routes.");
  process.exit(1);
}

await check("public health", "/api/health", { expect: 200 });
await check("public readiness", "/api/ready", { expect: 200 });
await check("records without key -> 401", "/api/records", { expect: 401 });
await check("records with wrong key -> 401", "/api/records", { key: "wrong-key", expect: 401 });
await check("records", "/api/records?limit=5", { key: apiKey, expect: 200 });
await check("stats", "/api/stats", { key: apiKey, expect: 200 });
await check("events", "/api/events?limit=5", { key: apiKey, expect: 200 });
await check("transfers", "/api/transfers?limit=5", { key: apiKey, expect: 200 });
await check("usage log", "/api/usage?limit=5", { key: apiKey, expect: 200 });
await check("invalid record id -> 400", "/api/records/not-a-number", { key: apiKey, expect: 400 });
await check("unknown record -> 404", "/api/records/99999999", { key: apiKey, expect: 404 });
await check("unknown route -> JSON 404", "/api/does-not-exist", { key: apiKey, expect: 404 });
await check("graphql without key -> 401", "/graphql", {
  method: "POST",
  body: { query: "{ __typename }" },
  expect: 401,
});
await check("graphql query", "/graphql", {
  method: "POST",
  key: apiKey,
  body: { query: "{ records(limit: 1) { items { id } } }" },
  expect: 200,
});

console.log("");
if (failures > 0) {
  console.log(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All checks passed.");
