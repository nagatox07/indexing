import { useCallback, useState } from "react";

import { api } from "../api";
import { formatTimestamp, formatTokenAmount, shortAddress } from "../format";
import { useResource } from "../hooks/useResource";
import { EmptyState, ErrorState, TableSkeleton } from "./StateBlocks";

const PAGE_SIZE = 10;

/** ERC-20 `Transfer` logs emitted by the DemoToken contract. */
export function TransfersPanel({ apiKey }: { apiKey: string }) {
  const [offset, setOffset] = useState(0);

  const load = useCallback(
    (signal: AbortSignal) => api.transfers(apiKey, { limit: PAGE_SIZE, offset }, signal),
    [apiKey, offset],
  );

  const { data, error, status, loading, reload } = useResource(load, apiKey.length > 0);

  const total = data?.meta.total ?? 0;
  const rows = data?.data ?? [];

  const kindOf = (row: { isMint: boolean; isBurn: boolean }) =>
    row.isMint ? "mint" : row.isBurn ? "burn" : "transfer";

  return (
    <section>
      <div className="toolbar">
        <span className="muted">
          ERC-20 Transfer events from the DemoToken contract, indexed by amount (18 decimals,
          BigInt-safe).
        </span>
        <div className="spacer" />
        <button type="button" onClick={reload} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error ? <ErrorState error={error} status={status} onRetry={reload} /> : null}

      {!error && loading && data === null ? <TableSkeleton columns={5} /> : null}

      {!error && data !== null && rows.length === 0 ? (
        <EmptyState
          title="No token transfers yet"
          message="Call DemoToken.mint() or transfer() on Sepolia and the Transfer log will be indexed here."
        />
      ) : null}

      {!error && rows.length > 0 ? (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Amount</th>
                  <th>Block</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className={`badge ${kindOf(row)}`}>{kindOf(row)}</span>
                    </td>
                    <td className="mono" title={row.fromAddress}>
                      {row.isMint ? <span className="muted">0x0 (mint)</span> : shortAddress(row.fromAddress, 6)}
                    </td>
                    <td className="mono" title={row.toAddress}>
                      {row.isBurn ? <span className="muted">0x0 (burn)</span> : shortAddress(row.toAddress, 6)}
                    </td>
                    <td className="mono">{formatTokenAmount(row.value)}</td>
                    <td className="mono muted">{row.blockNumber}</td>
                    <td className="muted">{formatTimestamp(row.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pager">
            <span>
              {total === 0
                ? "0 transfers"
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
