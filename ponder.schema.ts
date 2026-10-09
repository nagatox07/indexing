import { onchainTable } from "ponder";

/**
 * ChainIndex indexing schema (Ponder 0.18 + PostgreSQL).
 *
 * Every table here is an "onchain table": Ponder creates it, partitions/reorgs it,
 * and exposes it through GraphQL automatically.
 *
 * Rules enforced by Ponder's schema validation:
 * - exactly one primary key
 * - no serial / unique / generated columns
 * - no SQL default expressions
 * `bigint` below is Ponder's EVM bigint (numeric(78) -> JS bigint), which is required
 * for uint256 values such as record ids, timestamps and token amounts.
 */

/**
 * The latest known state of a `DataRegistry` record.
 * Rows are updated in place as records are updated or deleted.
 */
export const record = onchainTable("record", (t) => ({
  /** Solidity `recordId` */
  id: t.bigint().primaryKey(),
  /** Record owner (`msg.sender` at creation time) */
  owner: t.hex().notNull(),
  title: t.text().notNull(),
  content: t.text().notNull(),
  createdAt: t.bigint().notNull(),
  updatedAt: t.bigint().notNull(),
  /** `false` once the owner deleted the record */
  isDeleted: t.boolean().notNull(),
  createdTxHash: t.hex().notNull(),
  updatedTxHash: t.hex().notNull(),
  createdBlockNumber: t.bigint().notNull(),
  updatedBlockNumber: t.bigint().notNull(),
}));

/**
 * Immutable log of every DataRegistry lifecycle event.
 * This is the "event feed" the dashboard and API paginate over.
 */
export const recordEvent = onchainTable("record_event", (t) => ({
  /** `${txHash}-${logIndex}` - unique per log */
  id: t.text().primaryKey(),
  recordId: t.bigint().notNull(),
  owner: t.hex().notNull(),
  /** "created" | "updated" | "deleted" */
  action: t.text().notNull(),
  title: t.text().notNull(),
  content: t.text().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  logIndex: t.integer().notNull(),
  txHash: t.hex().notNull(),
}));

/**
 * ERC-20 `Transfer` events emitted by `DemoToken`.
 * Proves the indexer handles the most common event in Ethereum.
 */
export const tokenTransfer = onchainTable("token_transfer", (t) => ({
  /** `${txHash}-${logIndex}` - unique per log */
  id: t.text().primaryKey(),
  fromAddress: t.hex().notNull(),
  toAddress: t.hex().notNull(),
  /** Base units (18 decimals) */
  value: t.bigint().notNull(),
  /** `true` when `fromAddress` is the zero address (mint) */
  isMint: t.boolean().notNull(),
  /** `true` when `toAddress` is the zero address (burn) */
  isBurn: t.boolean().notNull(),
  timestamp: t.bigint().notNull(),
  blockNumber: t.bigint().notNull(),
  logIndex: t.integer().notNull(),
  txHash: t.hex().notNull(),
}));
