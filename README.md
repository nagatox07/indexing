# ChainIndex

A developer-facing blockchain indexing and API demo for **Ethereum Sepolia (chain ID 11155111)**.

ChainIndex watches two Solidity contracts on Sepolia, stores every event in PostgreSQL, and
exposes the indexed data through a GraphQL endpoint and a REST API protected by API keys with
usage logging. A React dashboard on top of the API visualises records, lifecycle events, ERC-20
transfers, API usage and system health.

```
Solidity (Foundry)  ->  Ponder indexer  ->  PostgreSQL  ->  GraphQL + REST (Hono)  ->  React dashboard
```

---

## Stack

| Layer | Technology |
| --- | --- |
| Contracts | Solidity 0.8.20, Foundry |
| Indexer | Ponder 0.18 |
| Database | PostgreSQL 14+ |
| API | Hono (REST) + GraphQL Yoga (via Ponder), API-key auth, usage logging |
| Dashboard | React 19 + TypeScript + Vite |

---

## Contracts

**`DataRegistry`** ([contracts/src/DataRegistry.sol](contracts/src/DataRegistry.sol)) — a simple
on-chain CRUD store:

| Function | Event |
| --- | --- |
| `createRecord(string title, string content)` | `RecordCreated(recordId, owner, title, content, timestamp)` |
| `updateRecord(uint256 recordId, string title, string content)` | `RecordUpdated(recordId, owner, title, content, timestamp)` |
| `deleteRecord(uint256 recordId)` | `RecordDeleted(recordId, owner, timestamp)` |

Only the owner can update or delete; deleting soft-deletes the record (it stays in the DB, flagged
`isDeleted`, so history remains queryable).

**`DemoToken`** ([contracts/src/DemoToken.sol](contracts/src/DemoToken.sol)) — a minimal ERC-20
with a public `mint()` so `Transfer` events can be generated easily to prove that generic event
indexing (including `uint256` amounts handled as `BigInt`) works.

Both contracts were written so that indexing is natural: every state change emits an event with
`recordId`/`owner` indexed.

---

## Indexed data (PostgreSQL)

| Table | Contents |
| --- | --- |
| `record` | Latest state per record (updated in place, `is_deleted` flag) |
| `record_event` | Immutable log of every `RecordCreated` / `RecordUpdated` / `RecordDeleted` |
| `token_transfer` | Every ERC-20 `Transfer` (`is_mint` / `is_burn` flags, base-unit amount) |
| `api_usage` | One row per API request (masked key, method, path, status, latency) |

Handlers live in [src/index.ts](src/index.ts), the schema in [ponder.schema.ts](ponder.schema.ts),
and the network configuration in [ponder.config.ts](ponder.config.ts).

---

## Setup

### 1. Prerequisites

- Node.js 20+
- PostgreSQL running locally
- [Foundry](https://book.getfoundry.sh/) (`forge`, `cast`) for the contracts

### 2. Install

```bash
npm install
```

### 3. Create the database and configure the environment

```bash
createdb chainindex
cp .env.example .env
```

Then fill in `.env` (see [.env.example](.env.example) for the full list):

| Variable | Required | Purpose |
| --- | --- | --- |
| `SEPOLIA_RPC_URL` | yes | Sepolia JSON-RPC endpoint |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `API_KEYS` | yes | Comma-separated API keys for the REST/GraphQL API |
| `DEPLOYER_PRIVATE_KEY` | deploy only | Funded Sepolia test wallet (never commit) |
| `PORT` | no | API port, default `42069` |
| `DATA_REGISTRY_ADDRESS` / `DATA_REGISTRY_START_BLOCK` | after deploy | Contract + first block to index |
| `DEMO_TOKEN_ADDRESS` / `DEMO_TOKEN_START_BLOCK` | after deploy | Contract + first block to index |
| `VITE_API_URL` | no | Dashboard API origin, default `http://localhost:42069` |

Generate an API key:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

> **Local Postgres without a password:** if your role has no password, use the unix socket form:
> `DATABASE_URL="postgresql:///chainindex?host=/var/run/postgresql"`.

### 4. Build the contracts and sync ABIs

```bash
npm run compile:contracts   # forge build + regenerate abis/*.ts
```

---

## Running

```bash
npm run dev            # Ponder indexer + API on http://localhost:42069
npm run dev:dashboard  # dashboard on http://localhost:5173  (in a second terminal)
```

Open the dashboard, paste your API key from `.env` into the header, and the records / activity /
transfers / usage panels populate.

### Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Indexer + API with hot reload |
| `npm run dev:dashboard` | Dashboard dev server (Vite) |
| `npm run build` | Contracts + Ponder codegen + dashboard bundle |
| `npm run build:dashboard` | Dashboard only -> `dashboard/dist` |
| `npm run start` | Production indexer + API (`ponder start`) |
| `npm run typecheck` | TypeScript check for the API and the dashboard |
| `npm run test:contracts` | Foundry test suite |
| `npm run sync:abis` | Re-generate `abis/*.ts` from `contracts/out` |
| `npm run smoke` | End-to-end API smoke test (needs a running server) |

---

## API

Base URL `http://localhost:42069`. Public endpoints need no key; everything else requires one via
`x-api-key: <key>`, `Authorization: Bearer <key>`, or `?apiKey=<key>`.

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | – | Liveness: database, RPC config, contract addresses |
| GET | `/api/ready` | – | Readiness: database + latest indexed block |
| GET | `/api/records` | ✔ | `?limit=&offset=&owner=&includeDeleted=` |
| GET | `/api/records/:id` | ✔ | Single record |
| GET | `/api/records/:id/events` | ✔ | Lifecycle history for one record |
| GET | `/api/events` | ✔ | Event feed, `?action=created\|updated\|deleted&recordId=` |
| GET | `/api/transfers` | ✔ | ERC-20 transfers, `?address=` |
| GET | `/api/stats` | ✔ | Aggregate counts for the dashboard tiles |
| GET | `/api/usage` | ✔ | Recent API requests (masked keys) |
| POST | `/graphql` | ✔ | GraphQL over the same tables |

Ponder also serves `/health`, `/ready`, `/status` and `/metrics`.

```bash
curl -s http://localhost:42069/api/health
curl -s -H "x-api-key: $KEY" http://localhost:42069/api/records?limit=5
curl -s -H "x-api-key: $KEY" -H 'content-type: application/json' \
  -d '{"query":"{ records(limit: 3) { items { id title owner isDeleted } } }"}' \
  http://localhost:42069/graphql
```

Large integers (`uint256` ids, timestamps, token amounts) are returned as **strings** so they
never lose precision in JSON.

---

## Deploying to Ethereum Sepolia

Requires a funded Sepolia test wallet in `DEPLOYER_PRIVATE_KEY`.

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --slow --gas-estimate-multiplier 1000
```

> **`--gas-estimate-multiplier 1000` is not optional on Sepolia.** `forge script` estimates gas by
> simulating locally, and Sepolia currently charges far more for contract creation than a local
> devnet. Measured for this exact bytecode: **8,065,756 gas on Sepolia vs 1,155,004 locally**
> (~7x, driven by the per-byte code-deposit cost). Forge's ~1.15M estimate is therefore roughly
> 7x too low, and a plain `--broadcast` reverts with *out of gas* while consuming the full limit.
> `cast send` is unaffected because it asks the node to estimate.

The script prints both addresses. The currently deployed instance is:

| Contract | Address | Deploy block |
| --- | --- | --- |
| `DataRegistry` | [`0x4200357FF109fAd29f27CE26Bd32ECe49cf8B6E2`](https://sepolia.etherscan.io/address/0x4200357FF109fAd29f27CE26Bd32ECe49cf8B6E2) | 11875498 |
| `DemoToken` | [`0x667293F9b145D5b8dA2efF46C561028c677c8CF9`](https://sepolia.etherscan.io/address/0x667293F9b145D5b8dA2efF46C561028c677c8CF9) | 11875499 |

Put the addresses and block numbers into `.env` (already filled in for this checkout with the
deployment above):

```bash
DATA_REGISTRY_ADDRESS=0x...
DATA_REGISTRY_START_BLOCK=<block number>
DEMO_TOKEN_ADDRESS=0x...
DEMO_TOKEN_START_BLOCK=<block number>
```

Restart `npm run dev`. The indexer backfills from the start blocks and the dashboard fills in.

To generate demo data afterwards, call the contracts from `cast`:

```bash
cast send $DATA_REGISTRY_ADDRESS "createRecord(string,string)" "Hello" "First record" \
  --rpc-url $SEPOLIA_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY
cast send $DEMO_TOKEN_ADDRESS "mint(address,uint256)" <recipient> 1000000000000000000000 \
  --rpc-url $SEPOLIA_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY
```

---

## Project layout

```
contracts/            Foundry project (src/, test/, script/)
abis/                 Generated TypeScript ABIs used by ponder.config.ts
ponder.config.ts      Chains, contracts, start blocks, database
ponder.schema.ts      PostgreSQL tables
src/index.ts          Event handlers
src/api/              Hono app: routes/, middleware/, lib/
dashboard/            React + Vite dashboard
scripts/              ponder launcher, ABI sync, smoke test
```

---

## Troubleshooting

- **`ECONNREFUSED 127.0.0.1:5432` / `client password must be a string`** — use the unix socket form
  of `DATABASE_URL` shown above, or give the role a password.
- **API on an unexpected port** — Ponder's CLI prefers an ambient `PORT` over `--port`. The
  `npm run dev` launcher ([scripts/ponder.js](scripts/ponder.js)) normalises this from `.env`.
- **`relation "live_query_tables" does not exist` when writing to the indexed tables** — a stale
  `live_query` trigger from an older Ponder version. Ponder 0.18 only needs `live_query_notify`:

  ```sql
  DROP TRIGGER IF EXISTS live_query ON public.record;
  DROP TRIGGER IF EXISTS live_query ON public.record_event;
  DROP TRIGGER IF EXISTS live_query ON public.token_transfer;
  DROP FUNCTION IF EXISTS public.live_query();
  ```

- **`forge script --broadcast` fails with out-of-gas on Sepolia** — see the deploy note above; pass
  `--gas-estimate-multiplier 1000`. The transaction still consumes its whole gas limit, so a failed
  attempt costs a small amount of test ETH.
- **Ponder clears its tables on restart** — `record`, `record_event` and `token_transfer` are owned
  by the indexer and are re-derived from the chain each run. After the contracts are deployed this
  is harmless: restarting re-backfills from the configured start blocks and the dashboard
  repopulates within seconds.
- **`npm run build` while `npm run dev` is running** — `build` runs `forge build`, regenerates
  `abis/*.ts` and spawns a second Ponder process for codegen, which disturbs the running dev
  server's database pool (`Cannot use a pool after calling end on the pool` on API routes).
  Stop `npm run dev`, run the build, then start the dev server again.
- **Hot reload** — editing `src/index.ts` or `src/api/**` reloads in place. Edits to
  `ponder.config.ts`, `ponder.schema.ts` or `abis/**` restart the indexer, which re-indexes from
  the configured start blocks.
