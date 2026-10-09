import { formatNumber } from "../format";
import type { Stats } from "../types";

function Tile({ label, value, hint }: { label: string; value: number | null; hint: string }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      {value === null ? (
        <div className="skeleton" style={{ width: 60, height: 26, margin: "8px 0 2px" }} />
      ) : (
        <div className="value">{formatNumber(value)}</div>
      )}
      <div className="hint">{hint}</div>
    </div>
  );
}

/**
 * Aggregate tiles. Every value is `null` until the first successful stats
 * request, which renders a shimmer placeholder instead of a misleading zero.
 */
export function StatCards({ stats }: { stats: Stats | null }) {
  const value = (selector: (data: Stats) => number): number | null =>
    stats === null ? null : selector(stats);

  return (
    <div className="stats">
      <Tile label="Records" value={value((s) => s.records.total)} hint="Created on-chain" />
      <Tile label="Active" value={value((s) => s.records.active)} hint="Not deleted" />
      <Tile label="Deleted" value={value((s) => s.records.deleted)} hint="Soft-deleted" />
      <Tile label="Events indexed" value={value((s) => s.events.total)} hint="Lifecycle logs" />
      <Tile label="Token transfers" value={value((s) => s.transfers.total)} hint="ERC-20 Transfer" />
      <Tile label="Unique owners" value={value((s) => s.records.uniqueOwners)} hint="Distinct addresses" />
    </div>
  );
}
