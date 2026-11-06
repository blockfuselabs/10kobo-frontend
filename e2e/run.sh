#!/usr/bin/env bash
# Starts a throwaway backend and frontend for the browser tests, runs them, then stops the servers.
# Uses its own database, ports and build folder, so it cannot touch normal development data.
set -u
cd "$(dirname "$0")/.."
FRONTEND="$PWD"
BACKEND="$PWD/../10kobo-backend"
export DATABASE_URL='postgres://tenkobo:localdev@localhost:54445/tenkobo_e2e'
LOGS=/tmp/10kobo-e2e-logs; mkdir -p "$LOGS"

(cd "$BACKEND" && npm run -s build) || exit 1
# The app does not change its own database, so this one must be brought up to date first.
(cd "$BACKEND" && npm run -s db:migrate) >"$LOGS/migrate.log" 2>&1
(cd "$BACKEND" && IDENTITY_PROVIDER=test ADMIN_TOKEN=admin-token-for-browser-tests-01 PORT=4011 CORS_ORIGINS=http://localhost:3011 PRIVY_APP_ID=test PRIVY_APP_SECRET=test PRIVY_VERIFICATION_KEY=test \
  env ${E2E_BACKEND_ENV:-} node dist/main >"$LOGS/backend.log" 2>&1) &
BACKEND_JOB=$!
env NEXT_DIST_DIR=.next-e2e NEXT_PUBLIC_IDENTITY=test NEXT_PUBLIC_API_URL=http://localhost:4011 ${E2E_FRONTEND_ENV:-} \
  npx next dev -p 3011 >"$LOGS/frontend.log" 2>&1 &
FRONTEND_JOB=$!
cleanup() { pkill -P "$BACKEND_JOB" 2>/dev/null; kill "$BACKEND_JOB" "$FRONTEND_JOB" 2>/dev/null; fuser -k 4011/tcp 3011/tcp >/dev/null 2>&1; }
trap cleanup EXIT

for _ in $(seq 1 90); do
  curl -sf -o /dev/null http://localhost:4011/health && curl -sf -o /dev/null http://localhost:3011 && break
  sleep 1
done
npx playwright test "$@"
