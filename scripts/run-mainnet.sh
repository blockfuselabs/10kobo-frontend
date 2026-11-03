#!/usr/bin/env bash
# Starts the web app on real money, from .env.mainnet. Run from the frontend folder.
set -euo pipefail
set -a; source .env.mainnet; set +a
export NODE_OPTIONS="--require $PWD/scripts/local-dns.cjs"
rm -rf .next
exec npm run -s dev
