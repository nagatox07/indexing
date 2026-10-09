import { useCallback } from "react";

import { api } from "../api";
import { formatIso } from "../format";
import { useResource } from "../hooks/useResource";
import { EmptyState, ErrorState, TableSkeleton } from "./StateBlocks";

/** Audit trail proving API-key authentication + usage logging are wired up. */
export function UsagePanel({ apiKey }: { apiKey: string }) {
  const load = useCallback(
    (signal: AbortSignal) => api.usage(apiKey, 50, signal),
    [apiKey],
  );

  const { data, error, status, loading, reload } = useResource(load, apiKey.length > 0);

  const rows = data?.data ?? [];

  return (
    <section>
      <div className="toolbar">
        <span className="muted">
          Every request handled by this API, with the masked API key that made it.
        </span>
        <div className="spacer" />
        <button type="button" onClick={reload} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error ? <ErrorState error={error} status={status} onRetry={reload} /> : null}

      {!error && loading && data === null ? <TableSkeleton columns={6} rows={6} /> : null}

      {!error && data !== null && rows.length === 0 ? (
        <EmptyState title="No requests logged yet" message="Make an API call and it will show up here." />
      ) : null}

      {!error && rows.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Method</th>
                <th>Path</th>
                <th>Status</th>
                <th>Duration</th>
                <th>API key</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="muted">{formatIso(row.createdAt)}</td>
                  <td className="mono">{row.method}</td>
                  <td className="mono">{row.path}</td>
                  <td>
                    <span className={`badge ${row.status < 400 ? "created" : "deleted"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="mono muted">{row.durationMs} ms</td>
                  <td className="mono muted">{row.apiKeyMask}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
