import { createConfig } from "ponder";
import { DataRegistryAbi } from "./abis/DataRegistryAbi.js";
import { DemoTokenAbi } from "./abis/DemoTokenAbi.js";

/**
 * Ponder Configuration for Ethereum Sepolia (Chain ID: 11155111)
 *
 * NOTE: Contract addresses and start blocks are read dynamically from environment variables
 * (or post-deployment artifacts). We do NOT hardcode mock or fake addresses.
 * Once deployed in Phase 3, the actual contract addresses and block numbers
 * will be populated here.
 */
const dataRegistryAddress = (process.env.DATA_REGISTRY_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;
const demoTokenAddress = (process.env.DEMO_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

const dataRegistryStartBlock = process.env.DATA_REGISTRY_START_BLOCK
  ? Number(process.env.DATA_REGISTRY_START_BLOCK)
  : undefined;

const demoTokenStartBlock = process.env.DEMO_TOKEN_START_BLOCK
  ? Number(process.env.DEMO_TOKEN_START_BLOCK)
  : undefined;

export default createConfig({
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
      address: dataRegistryAddress,
      startBlock: dataRegistryStartBlock,
    },
    DemoToken: {
      chain: "sepolia",
      abi: DemoTokenAbi,
      address: demoTokenAddress,
      startBlock: demoTokenStartBlock,
    },
  },
});
