#!/usr/bin/env bash
# Starts the web app on real money from .env.mainnet as a production build: pages load about three times faster and
# download about five times less than `run-mainnet.sh`, which matters on a phone. Changes need a rebuild, so use
# `run-mainnet.sh` while editing. Run from the frontend folder.
set -euo pipefail
set -a; source .env.mainnet; set +a
export NODE_OPTIONS="--require $PWD/scripts/local-dns.cjs"
export NEXT_DIST_DIR=.next-prod
rm -rf .next-prod
npx next build
# Next rewrites tsconfig.json during a build; keep the committed one.
git checkout -- tsconfig.json 2>/dev/null || true
exec npx next start -p 3010
