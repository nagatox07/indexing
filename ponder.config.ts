// Ponder only auto-loads `.env.local`, so ChainIndex loads `.env` itself.
// dotenv never overrides variables that are already set (CLI flags, shell exports).
import "dotenv/config";

import { createConfig } from "ponder";
import { DataRegistryAbi } from "./abis/DataRegistryAbi.js";
import { DemoTokenAbi } from "./abis/DemoTokenAbi.js";

/**
 * Ponder Configuration for Ethereum Sepolia (Chain ID: 11155111)
 *
 * Contract addresses and start blocks are read from environment variables so that
 * no mock or fake address is ever hardcoded. Fill them in after deploying:
 *
 *   DATA_REGISTRY_ADDRESS=0x...
 *   DATA_REGISTRY_START_BLOCK=<block number of the deploy tx>
 *   DEMO_TOKEN_ADDRESS=0x...
 *   DEMO_TOKEN_START_BLOCK=<block number of the deploy tx>
 *
 * Until then the contracts point at the zero address and start at `"latest"`,
 * which keeps startup cheap (no scan of the whole chain history) and simply
 * indexes nothing.
 */

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

/**
 * Resolves the deploy state for one contract.
 * An unset start block falls back to `"latest"` instead of block 0 so an
 * unconfigured contract never triggers a full-history `eth_getLogs` scan.
 */
function resolveContract(
  addressEnv?: string,
  startBlockEnv?: string,
): { address: `0x${string}`; startBlock: number | "latest" } {
  const address = (addressEnv || ZERO_ADDRESS) as `0x${string}`;

  if (startBlockEnv !== undefined && startBlockEnv !== "") {
    const parsed = Number(startBlockEnv);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error(`Invalid start block "${startBlockEnv}" - expected a non-negative integer.`);
    }
    return { address, startBlock: parsed };
  }

  return { address, startBlock: "latest" };
}

const dataRegistry = resolveContract(
  process.env.DATA_REGISTRY_ADDRESS,
  process.env.DATA_REGISTRY_START_BLOCK,
);
const demoToken = resolveContract(
  process.env.DEMO_TOKEN_ADDRESS,
  process.env.DEMO_TOKEN_START_BLOCK,
);

export default createConfig({
  // Use PostgreSQL (DATABASE_URL) instead of Ponder's default embedded PGlite.
  database: {
    kind: "postgres",
    connectionString: process.env.DATABASE_URL,
  },
  chains: {
    sepolia: {
      id: 11155111,
      rpc: process.env.SEPOLIA_RPC_URL,
    },
  },
  contracts: {
    DataRegistry: {
      chain: "sepolia",
      abi: DataRegistryAbi,
      address: dataRegistry.address,
      startBlock: dataRegistry.startBlock,
    },
    DemoToken: {
      chain: "sepolia",
      abi: DemoTokenAbi,
      address: demoToken.address,
      startBlock: demoToken.startBlock,
    },
  },
});
