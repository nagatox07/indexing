import { useCallback, useEffect, useState } from "react";

import { API_BASE, API_KEY_STORAGE, api } from "./api";
import { ActivityPanel } from "./components/ActivityPanel";
import { ApiKeyBar } from "./components/ApiKeyBar";
import { RecordsPanel } from "./components/RecordsPanel";
import { StatCards } from "./components/StatCards";
import { SystemPanel } from "./components/SystemPanel";
import { TransfersPanel } from "./components/TransfersPanel";
import { UsagePanel } from "./components/UsagePanel";
import { useResource } from "./hooks/useResource";

type TabId = "records" | "activity" | "transfers" | "usage" | "system";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "records", label: "Records" },
  { id: "activity", label: "Activity" },
  { id: "transfers", label: "Transfers" },
  { id: "usage", label: "API usage" },
  { id: "system", label: "System" },
];

/**
 * Initial key resolution: `?apiKey=` wins (handy for demo links), then
 * localStorage. The query parameter is stripped from the address bar so the
 * key is not left in browser history or a shared screenshot.
 */
function initialApiKey(): string {
  const params = new URLSearchParams(globalThis.location?.search ?? "");
  const fromUrl = params.get("apiKey")?.trim();
  if (fromUrl) {
    params.delete("apiKey");
    const query = params.toString();
    globalThis.history?.replaceState(
      null,
      "",
      `${globalThis.location.pathname}${query ? `?${query}` : ""}`,
    );
    return fromUrl;
  }
  return globalThis.localStorage?.getItem(API_KEY_STORAGE) ?? "";
}

export default function App() {
  const [apiKey, setApiKey] = useState<string>(initialApiKey);
  const [tab, setTab] = useState<TabId>("records");

  useEffect(() => {
    if (apiKey.length > 0) {
      globalThis.localStorage?.setItem(API_KEY_STORAGE, apiKey);
    } else {
      globalThis.localStorage?.removeItem(API_KEY_STORAGE);
    }
  }, [apiKey]);

  const loadStats = useCallback((signal: AbortSignal) => api.stats(apiKey, signal), [apiKey]);
  const stats = useResource(loadStats, apiKey.length > 0);

  const loadHealth = useCallback((signal: AbortSignal) => api.health(signal), []);
  const health = useResource(loadHealth, true);
  const reloadHealth = health.reload;

  // Poll the public health endpoint so the header pill recovers on its own
  // after the indexer restarts (instead of staying stale until a page reload).
  useEffect(() => {
    const timer = setInterval(reloadHealth, 15_000);
    return () => clearInterval(timer);
  }, [reloadHealth]);

  const healthState = health.error
    ? "bad"
    : health.data === null
      ? "warn"
      : health.data.status === "ok"
        ? "ok"
        : "warn";

  const healthLabel = health.error
    ? "API offline"
    : health.data === null
      ? "Checking API…"
      : health.data.status === "ok"
        ? "API healthy"
        : "API degraded";

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="logo">CI</div>
          <div>
            <h1>ChainIndex</h1>
            <small>
              Blockchain indexing &amp; API · Ethereum Sepolia (11155111)
            </small>
          </div>
        </div>

        <div className="header-actions">
          <span className={`pill ${healthState}`} title={`${API_BASE}/api/health`}>
            <span className="dot" />
            {healthLabel}
          </span>
          <span className="pill" title="Network">
            Sepolia
          </span>
          <ApiKeyBar
            apiKey={apiKey}
            onChange={setApiKey}
            onSignOut={() => setApiKey("")}
          />
        </div>
      </header>

      {apiKey.length === 0 ? (
        <div className="error-box" style={{ marginTop: 20 }}>
          <strong>API key required</strong>
          <div>
            Enter the value of <code>API_KEYS</code> from your local <code>.env</code> file in the
            field above. Health and system status stay available without it.
          </div>
        </div>
      ) : null}

      {stats.error && stats.status === 401 ? (
        <div className="error-box" style={{ marginTop: 20 }}>
          <strong>That API key was rejected</strong>
          <div>Check <code>API_KEYS</code> in <code>.env</code> and connect again.</div>
        </div>
      ) : null}

      <StatCards stats={stats.data?.data ?? null} />

      <nav className="tabs" role="tablist" aria-label="Dashboard sections">
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === entry.id}
            onClick={() => setTab(entry.id)}
          >
            {entry.label}
          </button>
        ))}
        <div className="spacer" style={{ flex: 1 }} />
        {tab !== "system" ? (
          <button type="button" className="tab" onClick={stats.reload} disabled={stats.loading}>
            {stats.loading ? "Refreshing…" : "Refresh stats"}
          </button>
        ) : null}
      </nav>

      {tab === "records" ? <RecordsPanel apiKey={apiKey} /> : null}
      {tab === "activity" ? <ActivityPanel apiKey={apiKey} /> : null}
      {tab === "transfers" ? <TransfersPanel apiKey={apiKey} /> : null}
      {tab === "usage" ? <UsagePanel apiKey={apiKey} /> : null}
      {tab === "system" ? <SystemPanel /> : null}

      <footer className="app-footer">
        ChainIndex demo — Solidity · Ponder · PostgreSQL · GraphQL · REST · React
      </footer>
    </div>
  );
}
