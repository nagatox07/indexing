import { ponder } from "ponder:registry";
import { record, recordEvent, tokenTransfer } from "ponder:schema";

/**
 * ChainIndex indexing functions.
 *
 * Ponder calls one function per contract event. Each handler writes into the
 * tables defined in `ponder.schema.ts`, which Ponder exposes over GraphQL and
 * which the Hono REST API reads from.
 *
 * Note: `context.db` is Ponder's write API. Writes are transactional and are
 * rolled back automatically if the handler throws.
 */

/** Unique, deterministic id for a log: `<txHash>-<logIndex>`. */
const logId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// ---------------------------------------------------------------------------
// DataRegistry: RecordCreated / RecordUpdated / RecordDeleted
// ---------------------------------------------------------------------------

ponder.on("DataRegistry:RecordCreated", async ({ event, context }) => {
  const { recordId, owner, title, content, timestamp } = event.args;
  const txHash = event.transaction.hash;
  const blockNumber = event.block.number;
  const id = logId(txHash, event.log.logIndex);

  await context.db.insert(record).values({
    id: recordId,
    owner,
    title,
    content,
    createdAt: timestamp,
    updatedAt: timestamp,
    isDeleted: false,
    createdTxHash: txHash,
    updatedTxHash: txHash,
    createdBlockNumber: blockNumber,
    updatedBlockNumber: blockNumber,
  });

  await context.db.insert(recordEvent).values({
    id,
    recordId,
    owner,
    action: "created",
    title,
    content,
    timestamp,
    blockNumber,
    logIndex: event.log.logIndex,
    txHash,
  });
});

ponder.on("DataRegistry:RecordUpdated", async ({ event, context }) => {
  const { recordId, owner, title, content, timestamp } = event.args;
  const txHash = event.transaction.hash;
  const blockNumber = event.block.number;
  const id = logId(txHash, event.log.logIndex);

  // The record must already exist (it is only updated by its owner).
  await context.db.update(record, { id: recordId }).set({
    title,
    content,
    updatedAt: timestamp,
    isDeleted: false,
    updatedTxHash: txHash,
    updatedBlockNumber: blockNumber,
  });

  await context.db.insert(recordEvent).values({
    id,
    recordId,
    owner,
    action: "updated",
    title,
    content,
    timestamp,
    blockNumber,
    logIndex: event.log.logIndex,
    txHash,
  });
});

ponder.on("DataRegistry:RecordDeleted", async ({ event, context }) => {
  const { recordId, owner, timestamp } = event.args;
  const txHash = event.transaction.hash;
  const blockNumber = event.block.number;
  const id = logId(txHash, event.log.logIndex);

  const existing = await context.db.find(record, { id: recordId });

  // Keep the row (so history stays queryable) but flag it as deleted and
  // capture the latest content so the dashboard can still render the card.
  await context.db.update(record, { id: recordId }).set({
    updatedAt: timestamp,
    isDeleted: true,
    updatedTxHash: txHash,
    updatedBlockNumber: blockNumber,
  });

  await context.db.insert(recordEvent).values({
    id,
    recordId,
    owner,
    action: "deleted",
    title: existing?.title ?? "",
    content: existing?.content ?? "",
    timestamp,
    blockNumber,
    logIndex: event.log.logIndex,
    txHash,
  });
});

// ---------------------------------------------------------------------------
// DemoToken: Transfer (ERC-20)
// ---------------------------------------------------------------------------

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

ponder.on("DemoToken:Transfer", async ({ event, context }) => {
  const { from, to, value } = event.args;
  const txHash = event.transaction.hash;

  await context.db.insert(tokenTransfer).values({
    id: logId(txHash, event.log.logIndex),
    fromAddress: from,
    toAddress: to,
    value,
    isMint: from.toLowerCase() === ZERO_ADDRESS,
    isBurn: to.toLowerCase() === ZERO_ADDRESS,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
    logIndex: event.log.logIndex,
    txHash,
  });
});
