import { useCallback, useEffect, useState } from "react";

import { ApiError } from "../api";

export type ResourceState<T> = {
  data: T | null;
  error: string | null;
  /** 0 while the very first load for the current key is in flight. */
  status: number | null;
  loading: boolean;
  reload: () => void;
};

/**
 * Minimal fetch hook. `load` must be a stable callback (wrap it in `useCallback`)
 * that receives the abort signal; pass `enabled: false` to skip fetching while a
 * required input (such as the API key) is missing.
 */
export function useResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  enabled: boolean,
): ResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setLoading(true);

    load(controller.signal)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
        setStatus(null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        if (cause instanceof ApiError) {
          setStatus(cause.status);
          setError(cause.message);
        } else {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [load, enabled, nonce]);

  return { data, error, status, loading, reload };
}
