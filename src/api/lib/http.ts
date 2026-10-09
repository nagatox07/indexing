/** Converts BigInt (and other JSON-hostile) values so `JSON.stringify` works. */
export function jsonSafe<T>(value: T): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(jsonSafe);
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = jsonSafe(entry);
    }
    return out;
  }
  return value;
}

/** Parses a positive integer query param with a fallback. */
export function readInt(
  value: string | undefined,
  fallback: number,
  max: number,
): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}
