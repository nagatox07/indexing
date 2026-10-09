import { useCallback, useState } from "react";

import { api } from "../api";
import { formatTimestamp, shortAddress } from "../format";
import { useResource } from "../hooks/useResource";
import { EmptyState, ErrorState, TableSkeleton } from "./StateBlocks";

const PAGE_SIZE = 10;

/**
 * Browses the `record` table (latest state per DataRegistry record) with an
 * owner filter and an option to include soft-deleted rows.
 */
export function RecordsPanel({ apiKey }: { apiKey: string }) {
  const [offset, setOffset] = useState(0);
  const [owner, setOwner] = useState("");
  const [ownerInput, setOwnerInput] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const load = useCallback(
    (signal: AbortSignal) =>
      api.records(
        apiKey,
        { limit: PAGE_SIZE, offset, owner: owner || undefined, includeDeleted },
        signal,
      ),
    [apiKey, offset, owner, includeDeleted],
  );

  const { data, error, status, loading, reload } = useResource(load, apiKey.length > 0);

  const total = data?.meta.total ?? 0;
  const rows = data?.data ?? [];

  return (
    <section>
      <div className="toolbar">
        <input
          placeholder="Filter by owner 0x…"
          value={ownerInput}
          onChange={(event) => setOwnerInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              setOffset(0);
              setOwner(ownerInput.trim());
            }
          }}
          aria-label="Filter by owner address"
          style={{ width: 300 }}
        />
        <button
          type="button"
          onClick={() => {
            setOffset(0);
            setOwner(ownerInput.trim());
          }}
        >
          Filter
        </button>
        <label className="pill" style={{ cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(event) => {
              setOffset(0);
              setIncludeDeleted(event.target.checked);
            }}
          />
          Show deleted
        </label>
        <div className="spacer" />
        <button type="button" onClick={reload} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error ? <ErrorState error={error} status={status} onRetry={reload} /> : null}

      {!error && loading && data === null ? <TableSkeleton columns={6} /> : null}

      {!error && data !== null && rows.length === 0 ? (
        <EmptyState
          title="No records yet"
          message={
            owner
              ? `No records owned by ${shortAddress(owner, 6)} have been indexed.`
              : "Once DataRegistry.createRecord transactions are mined on Sepolia, they appear here automatically."
          }
          action="Clear filters"
          onAction={() => {
            setOwner("");
            setOwnerInput("");
            setIncludeDeleted(false);
            setOffset(0);
          }}
        />
      ) : null}

      {!error && rows.length > 0 ? (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Tx</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="mono">{row.id}</td>
                    <td>
                      <div>{row.title}</div>
                      <div className="muted truncate">{row.content}</div>
                    </td>
                    <td className="mono" title={row.owner}>
                      {shortAddress(row.owner, 6)}
                    </td>
                    <td>
                      <span className={`badge ${row.isDeleted ? "deleted" : "created"}`}>
                        {row.isDeleted ? "deleted" : "active"}
                      </span>
                    </td>
                    <td className="muted">{formatTimestamp(row.updatedAt)}</td>
                    <td className="mono muted" title={row.updatedTxHash}>
                      {shortAddress(row.updatedTxHash, 5)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pager">
            <span>
              {total === 0
                ? "0 records"
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
