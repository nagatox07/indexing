#!/usr/bin/env node
/**
 * Launcher for the Ponder CLI.
 *
 * Why this exists:
 *  - Ponder's CLI only auto-loads `.env.local`, so ChainIndex's `.env` is
 *    loaded here with `dotenv` (which never overrides an already-exported var).
 *  - Ponder 0.18 resolves its HTTP port from the ambient `PORT` variable and
 *    *prefers it over* the `--port` flag. In shells that export `PORT=0`
 *    (common in sandboxes and PM2/Docker setups) the server would silently bind
 *    a random port. This wrapper normalises `PORT` for `dev`/`start`.
 *  - Ponder's interactive terminal UI redraws the console and, when stdout is
 *    not a TTY (output redirected to a file, CI, a VSCode task), its hot reload
 *    path races the database pool teardown and the dev server exits with
 *    "Cannot use a pool after calling end on the pool". `--disable-ui` is added
 *    automatically whenever stdout is not a terminal.
 *
 * Usage: node scripts/ponder.js <ponder args...>
 *   npm run dev      -> node scripts/ponder.js dev
 *   npm run start    -> node scripts/ponder.js start
 */
import "dotenv/config";

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const ponderBin = path.join(
  rootDir,
  "node_modules",
  "ponder",
  "dist",
  "esm",
  "bin",
  "ponder.js",
);

const args = process.argv.slice(2);
const [command] = args;

// Plain log output instead of the console UI when stdout is redirected.
if (command === "dev" && !process.stdout.isTTY && !args.includes("--disable-ui")) {
  args.push("--disable-ui");
}

/** `true` when the user already picked a port explicitly on the command line. */
const hasExplicitPort = args.some(
  (arg) => arg === "--port" || arg === "-p" || arg.startsWith("--port="),
);

const env = { ...process.env };

if ((command === "dev" || command === "start") && !hasExplicitPort) {
  const configured = Number(env.PORT);
  env.PORT = Number.isInteger(configured) && configured > 0 ? String(configured) : "42069";
}

const child = spawn(process.execPath, [ponderBin, ...args], {
  cwd: rootDir,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  process.exit(signal ? 1 : (code ?? 0));
});
