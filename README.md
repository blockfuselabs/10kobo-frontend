# 10kobo web app

The web app for **10kobo: naira and stablecoins, both ways.** People pay Nigerian banks, airtime and wallets on 16
networks by chat or on the Send page; businesses send invoices payable in naira or crypto; anyone can pay a pay
link with no account. Built at NEAR HACKATHON (November 2026).

**What 10kobo is, what NEAR does in it, the proof and how to try it with no keys are in the backend's README:
[blockfuselabs/10kobo-backend](https://github.com/blockfuselabs/10kobo-backend).**

## Run it for development

Start the backend first (`npm run db:up && npm run dev` in `10kobo-backend`, on port 4010). Then:

```
cp .env.example .env.local
# For local work without Privy keys, add these two lines to .env.local:
#   NEXT_PUBLIC_IDENTITY=test
#   NEXT_PUBLIC_API_URL=http://localhost:4010
npm ci
npm run dev                  # http://localhost:3010
```

`NEXT_PUBLIC_IDENTITY=test` signs you in with a test login, and only works against a backend in test mode, which
refuses it in production.

## Check it

```
npm test                     # unit tests (Vitest)
npm run typecheck
npm run build
./e2e/run.sh                 # browser tests in Chrome, against a throwaway backend and database
```

## Where things are

| Part | Folder |
| --- | --- |
| Pages: home, `/pay/[id]` (pay link), `/proof`, `/shop` (demo shop), `/agent`, `/admin` | `app/` |
| Chat, Send, Deposit, Invoices, Activity and the approval cards | `components/` |
| The API client and every type the backend returns | `lib/api/client.ts` |
| Real payments shown on `/proof` | `lib/proof.ts` |
| The checkout button shops embed | `public/checkout.js` |
| Browser tests | `e2e/` |

Components use `useAuth()` and `useWallet()`. Only `lib/privy-provider.tsx` imports Privy, and
`lib/api/client.ts` knows nothing about React or Privy, so outside services can be swapped in one place.

## Disclosure

See the backend README: built in the window (everything for NEAR is after the `base-before-near` tag), some code
adapted from Tokkenly, Blockfuse Labs' earlier product, and most code written with Claude Code.
