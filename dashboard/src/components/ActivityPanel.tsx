import { useCallback, useState } from "react";

import { api } from "../api";
import { formatTimestamp, shortAddress } from "../format";
import { useResource } from "../hooks/useResource";
import { EmptyState, ErrorState } from "./StateBlocks";

const PAGE_SIZE = 15;
const ACTIONS = ["", "created", "updated", "deleted"] as const;

/** The immutable event feed: one item per RecordCreated / Updated / Deleted log. */
export function ActivityPanel({ apiKey }: { apiKey: string }) {
  const [offset, setOffset] = useState(0);
  const [action, setAction] = useState<string>("");

  const load = useCallback(
    (signal: AbortSignal) =>
      api.events(apiKey, { limit: PAGE_SIZE, offset, action: action || undefined }, signal),
    [apiKey, offset, action],
  );

  const { data, error, status, loading, reload } = useResource(load, apiKey.length > 0);

  const total = data?.meta.total ?? 0;
  const rows = data?.data ?? [];

  return (
    <section>
      <div className="toolbar">
        <label className="muted" htmlFor="activity-action-filter">
          Action
        </label>
        <select
          id="activity-action-filter"
          value={action}
          onChange={(event) => {
            setOffset(0);
            setAction(event.target.value);
          }}
        >
          {ACTIONS.map((value) => (
            <option key={value || "all"} value={value}>
              {value === "" ? "All" : value}
            </option>
          ))}
        </select>
        <div className="spacer" />
        <button type="button" onClick={reload} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error ? <ErrorState error={error} status={status} onRetry={reload} /> : null}

      {!error && loading && data === null ? (
        <div className="feed">
          {Array.from({ length: 5 }, (_, index) => (
            <li key={index} style={{ listStyle: "none" }}>
              <div className="skeleton" style={{ width: "100%", height: 44 }} />
            </li>
          ))}
        </div>
      ) : null}

      {!error && data !== null && rows.length === 0 ? (
        <EmptyState
          title="No lifecycle events yet"
          message="RecordCreated, RecordUpdated and RecordDeleted logs will stream in here as the indexer processes Sepolia blocks."
        />
      ) : null}

      {!error && rows.length > 0 ? (
        <>
          <ul className="feed">
            {rows.map((row) => (
              <li key={row.id}>
                <span className={`badge ${row.action}`}>{row.action}</span>
                <div className="feed-body">
                  <div className="feed-title">
                    Record #{row.recordId} — {row.title || <span className="muted">(no title)</span>}
                  </div>
                  <div className="feed-meta">
                    by <span className="mono">{shortAddress(row.owner, 6)}</span> · block{" "}
                    <span className="mono">{row.blockNumber}</span> ·{" "}
                    {formatTimestamp(row.timestamp)} · tx{" "}
                    <span className="mono">{shortAddress(row.txHash, 5)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="pager">
            <span>
              {total === 0
                ? "0 events"
                : `${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} of ${total}`}
            </span>
            <span style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
                disabled={offset === 0 || loading}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setOffset((value) => value + PAGE_SIZE)}
                disabled={offset + PAGE_SIZE >= total || loading}
              >
                Next
              </button>
            </span>
          </div>
        </>
      ) : null}
    </section>
  );
}
