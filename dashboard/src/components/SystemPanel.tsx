import { useCallback } from "react";

import { API_BASE, api } from "../api";
import { formatNumber } from "../format";
import { useResource } from "../hooks/useResource";
import { ErrorState } from "./StateBlocks";

/**
 * Public health + readiness endpoints. These need no API key, so this panel
 * still renders when the key is missing or wrong.
 */
export function SystemPanel() {
  const loadHealth = useCallback((signal: AbortSignal) => api.health(signal), []);
  const loadReadiness = useCallback((signal: AbortSignal) => api.readiness(signal), []);

  const health = useResource(loadHealth, true);
  const readiness = useResource(loadReadiness, true);

  const database = health.data?.checks.database;
  const registry = health.data?.checks.contracts.dataRegistry;
  const token = health.data?.checks.contracts.demoToken;

  return (
    <div className="grid-2">
      <div className="card">
        <h2>Indexer</h2>
        {health.error ? (
          <ErrorState error={health.error} status={health.status} onRetry={health.reload} />
        ) : (
          <>
            <div className="kv">
              <span>API base</span>
              <span className="mono">{API_BASE}</span>
            </div>
            <div className="kv">
              <span>Readiness</span>
              <span>
                {readiness.data === null
                  ? "…"
                  : readiness.data.status === "ready"
                    ? "ready"
                    : "starting (waiting for first checkpoint)"}
              </span>
            </div>
            <div className="kv">
              <span>Chain ID</span>
              <span className="mono">11155111 (Ethereum Sepolia)</span>
            </div>
            <div className="kv">
              <span>Latest indexed block</span>
              <span className="mono">
                {readiness.data?.latestIndexedBlock ? formatNumber(Number(readiness.data.latestIndexedBlock)) : "—"}
              </span>
            </div>
            <div className="kv">
              <span>Uptime</span>
              <span>{health.data ? `${formatNumber(health.data.uptimeSeconds)} s` : "…"}</span>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2>Dependencies</h2>
        <div className="kv">
          <span>PostgreSQL</span>
          <span>
            {database === undefined
              ? "…"
              : database.status === "up"
                ? `up (${database.latencyMs} ms)`
                : `down — ${database.error ?? "unknown error"}`}
          </span>
        </div>
        <div className="kv">
          <span>Sepolia RPC</span>
          <span>{health.data?.checks.rpc.status ?? "…"}</span>
        </div>
        <div className="kv">
          <span>DataRegistry address</span>
          <span className="mono" style={{ wordBreak: "break-all" }}>
            {registry ?? "not configured (set DATA_REGISTRY_ADDRESS)"}
          </span>
        </div>
        <div className="kv">
          <span>DemoToken address</span>
          <span className="mono" style={{ wordBreak: "break-all" }}>
            {token ?? "not configured (set DEMO_TOKEN_ADDRESS)"}
          </span>
        </div>
      </div>
    </div>
  );
}
