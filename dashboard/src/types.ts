/**
 * Shapes returned by the ChainIndex REST API.
 *
 * All EVM `uint256` values arrive as strings (the API converts `bigint` to
 * string so JSON stays lossless), and must be kept as strings/`bigint` here
 * rather than parsed into `number`.
 */

export type Paged<T> = {
  data: T[];
  meta: { limit: number; offset: number; total: number; count: number };
};

export type RecordRow = {
  id: string;
  owner: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  createdTxHash: string;
  updatedTxHash: string;
  createdBlockNumber: string;
  updatedBlockNumber: string;
};

export type RecordEventRow = {
  id: string;
  recordId: string;
  owner: string;
  action: "created" | "updated" | "deleted";
  title: string;
  content: string;
  timestamp: string;
  blockNumber: string;
  logIndex: number;
  txHash: string;
};

export type TokenTransferRow = {
  id: string;
  fromAddress: string;
  toAddress: string;
  value: string;
  isMint: boolean;
  isBurn: boolean;
  timestamp: string;
  blockNumber: string;
  logIndex: number;
  txHash: string;
};

export type Stats = {
  records: { total: number; active: number; deleted: number; uniqueOwners: number };
  events: { total: number; created: number; updated: number; deleted: number };
  transfers: { total: number };
};

export type UsageEntry = {
  id: string;
  apiKeyMask: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  ip: string | null;
  createdAt: string;
};

export type Health = {
  status: "ok" | "degraded";
  service: string;
  timestamp: string;
  uptimeSeconds: number;
  checks: {
    database: { status: "up" | "down"; latencyMs: number; error: string | null };
    rpc: { status: string };
    contracts: { dataRegistry: string | null; demoToken: string | null };
  };
};

export type Readiness = {
  status: "ready" | "starting";
  database: "up" | "down";
  indexerReady: boolean;
  chainId: number;
  latestIndexedBlock: string | null;
  timestamp: string;
};
