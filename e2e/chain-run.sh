#!/usr/bin/env bash
# Browser tests with real USDC moves: a local copy of Base Sepolia, real contracts, public test keys.
# Nothing here reaches the real network or spends anything. The agent uses the real model, which costs a little.
set -u
cd "$(dirname "$0")/.."
BACKEND="$PWD/../10kobo-backend"
STATE=/tmp/10kobo-e2e-fork.env
rm -f "$STATE"
(cd "$BACKEND" && exec npx ts-node --transpile-only test/chain/e2e-fork.ts "$STATE") >/tmp/10kobo-e2e-fork.log 2>&1 &
FORK_JOB=$!
trap 'kill "$FORK_JOB" 2>/dev/null; fuser -k 18545/tcp >/dev/null 2>&1' EXIT
for _ in $(seq 1 180); do [ -s "$STATE" ] && break; sleep 1; done
[ -s "$STATE" ] || { echo 'The local chain did not start'; tail -5 /tmp/10kobo-e2e-fork.log; exit 1; }
. "$STATE"
docker exec tenkobo-pg psql -q -U tenkobo -d tenkobo_e2e -c 'TRUNCATE users, funding_transactions, chain_cursors, op_switches CASCADE' >/dev/null
export E2E_WALLET="$WALLET" E2E_RPC=http://127.0.0.1:18545
export E2E_BACKEND_ENV="PAYMENTS_MODE=chain CHAIN_RPC_URL=$E2E_RPC COLLECTION_ADDRESS=$COLLECTION COLLECTION_KEY=$COLLECTION_KEY SERVER_OWNER_KEY=$SERVER_KEY WORKER_INTERVAL_MS=4000 REQUIRE_PIN=true ADMIN_TOKEN=admin-token-for-browser-tests-01"
export E2E_FRONTEND_ENV="NEXT_PUBLIC_TEST_EMAIL=chain@example.com NEXT_PUBLIC_TEST_WALLET=$WALLET NEXT_PUBLIC_TEST_RPC=$E2E_RPC NEXT_PUBLIC_TEST_OWNER_KEY=$OWNER_KEY"
e2e/run.sh money admin "$@"
