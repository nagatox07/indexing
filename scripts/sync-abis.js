import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT_DIR, "contracts", "out");
const ABIS_DIR = path.join(ROOT_DIR, "abis");

if (!fs.existsSync(ABIS_DIR)) {
  fs.mkdirSync(ABIS_DIR, { recursive: true });
}

// Contracts we want to extract ABIs for
const TARGET_CONTRACTS = ["DataRegistry", "DemoToken"];

for (const contractName of TARGET_CONTRACTS) {
  const artifactPath = path.join(OUT_DIR, `${contractName}.sol`, `${contractName}.json`);

  if (!fs.existsSync(artifactPath)) {
    console.warn(`[sync-abis] Artifact not found at ${artifactPath}. Skipping until compiled.`);
    continue;
  }

  try {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    const abi = artifact.abi;

    // 1. Write clean JSON ABI
    const jsonPath = path.join(ABIS_DIR, `${contractName}Abi.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(abi, null, 2));

    // 2. Write TypeScript ABI with 'as const' for strict Viem typing
    const tsPath = path.join(ABIS_DIR, `${contractName}Abi.ts`);
    const tsContent = `// Auto-generated from contracts/out/${contractName}.sol/${contractName}.json
export const ${contractName}Abi = ${JSON.stringify(abi, null, 2)} as const;\n`;
    fs.writeFileSync(tsPath, tsContent);

    console.log(`[sync-abis] Successfully synced ABI for ${contractName} -> abis/${contractName}Abi.ts`);
  } catch (error) {
    console.error(`[sync-abis] Failed to process ${contractName}:`, error);
  }
}
