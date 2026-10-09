import { createMiddleware } from "hono/factory";

/**
 * API-key authentication.
 *
 * Keys are configured as a comma-separated list in the API_KEYS env var so the
 * college demo needs no extra infrastructure. Any key in the list is accepted;
 * requests without a valid key get a 401 with a machine-readable error body.
 *
 * Accepted transports (all optional, checked in order):
 *   x-api-key: <key>          (preferred)
 *   Authorization: Bearer <key>
 *   ?apiKey=<key>             (for GraphiQL links and curl demos)
 */
const HEADER_NAME = "x-api-key";
const QUERY_NAME = "apiKey";

function configuredKeys(): string[] {
  return (process.env.API_KEYS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/** Never echo the raw key back; only a short fingerprint for the usage log. */
export function maskKey(key: string | null | undefined): string {
  if (!key) return "anonymous";
  if (key.length <= 8) return `${key.slice(0, 2)}***`;
  return `${key.slice(0, 4)}***${key.slice(-4)}`;
}

export function extractApiKey(
  header: string | undefined,
  authorization: string | undefined,
  query: string | undefined,
): string | null {
  if (header && header.trim().length > 0) return header.trim();
  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    if (match?.[1]) return match[1].trim();
  }
  if (query && query.trim().length > 0) return query.trim();
  return null;
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const keys = configuredKeys();
  const presented = extractApiKey(
    c.req.header(HEADER_NAME),
    c.req.header("authorization"),
    c.req.query(QUERY_NAME),
  );

  if (keys.length === 0) {
    return c.json(
      {
        error: "api_keys_not_configured",
        message: "Set API_KEYS in .env and restart the server.",
      },
      503,
    );
  }

  if (presented === null) {
    return c.json(
      {
        error: "missing_api_key",
        message: `Provide an API key via the ${HEADER_NAME} header, an Authorization: Bearer token, or ?${QUERY_NAME}= query parameter.`,
      },
      401,
    );
  }

  if (!keys.includes(presented)) {
    return c.json(
      {
        error: "invalid_api_key",
        message: "The provided API key is not recognised.",
      },
      401,
    );
  }

  c.set("apiKeyMask", maskKey(presented));
  await next();
});

declare module "hono" {
  interface ContextVariableMap {
    apiKeyMask: string;
    responseDurationMs?: number;
  }
}
