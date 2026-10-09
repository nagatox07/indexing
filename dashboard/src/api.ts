import type {
  Health,
  Paged,
  Readiness,
  RecordEventRow,
  RecordRow,
  Stats,
  TokenTransferRow,
  UsageEntry,
} from "./types";

/**
 * Base origin of the ChainIndex API (the Ponder server).
 * Override with VITE_API_URL when the API runs somewhere else.
 */
export const API_BASE = (
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:42069"
).replace(/\/+$/, "");

export const API_KEY_STORAGE = "chainindex.apiKey";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  apiKey: string | null,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      signal,
      headers: apiKey ? { "x-api-key": apiKey } : undefined,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, `Cannot reach the API at ${API_BASE}. Is the indexer running?`);
  }

  const text = await response.text();
  let body: unknown = null;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!response.ok) {
    const message =
      body !== null && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : `Request failed with status ${response.status}.`;
    throw new ApiError(response.status, message);
  }

  return body as T;
}

/** Paths relative to the API root (the client adds `/api`). */
export const api = {
  health: (signal?: AbortSignal) => request<Health>("/api/health", null, signal),
  readiness: (signal?: AbortSignal) => request<Readiness>("/api/ready", null, signal),

  stats: (apiKey: string, signal?: AbortSignal) =>
    request<{ data: Stats }>("/api/stats", apiKey, signal),

  records: (
    apiKey: string,
    params: { limit: number; offset: number; owner?: string; includeDeleted?: boolean },
    signal?: AbortSignal,
  ) => {
    const search = new URLSearchParams({
      limit: String(params.limit),
      offset: String(params.offset),
    });
    if (params.owner) search.set("owner", params.owner);
    if (params.includeDeleted) search.set("includeDeleted", "true");
    return request<Paged<RecordRow>>(`/api/records?${search}`, apiKey, signal);
  },

  events: (
    apiKey: string,
    params: { limit: number; offset: number; action?: string },
    signal?: AbortSignal,
  ) => {
    const search = new URLSearchParams({
      limit: String(params.limit),
      offset: String(params.offset),
    });
    if (params.action) search.set("action", params.action);
    return request<Paged<RecordEventRow>>(`/api/events?${search}`, apiKey, signal);
  },

  transfers: (
    apiKey: string,
    params: { limit: number; offset: number },
    signal?: AbortSignal,
  ) =>
    request<Paged<TokenTransferRow>>(
      `/api/transfers?limit=${params.limit}&offset=${params.offset}`,
      apiKey,
      signal,
    ),

  usage: (apiKey: string, limit: number, signal?: AbortSignal) =>
    request<{ data: UsageEntry[] }>(`/api/usage?limit=${limit}`, apiKey, signal),
};
