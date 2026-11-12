# 10kobo web app

**Dollars to any wallet. Naira to any bank. For people and AI agents.**

The web app for 10kobo, live at **https://10kobo.xyz**. People hold dollars (USDC) in their own wallet and pay any
Nigerian bank, airtime or wallets on 16 networks just by chatting. Businesses take payments with payment links, a
no-code checkout widget or merchant keys, paid in naira or crypto. AI agents pay with x402 on NEAR. Built at
NEAR HACKATHON (November 2026).

**What 10kobo is, what NEAR does in it, the proof and how to try it are in the backend's README:
[blockfuselabs/10kobo-backend](https://github.com/blockfuselabs/10kobo-backend).**

| Page | What it is |
| --- | --- |
| https://10kobo.xyz | The app: chat, Send, Deposit, Invoices, Payment links, Activity and Settings |
| https://10kobo.xyz/docs | Public developer docs: x402, HTTP API, MCP, checkout widget, merchant API, webhooks, limits and errors |
| https://10kobo.xyz/llms.txt | The same docs in plain text, for AI agents |
| https://10kobo.xyz/shop | A demo shop with the checkout widget, taking real payments |
| https://10kobo.xyz/agent | How an AI agent pays, with x402, HTTP and MCP examples |
| https://10kobo.xyz/proof | Real mainnet payments, with explorer links |
| `/pay/[id]`, `/p/[id]` | A pay link (one invoice) and a payment link (reusable), payable with no account |

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
refuses it in production. For the whole app with simulated payments and no keys, use `./scripts/demo-start.sh` in
the backend, as its README explains.

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
| Pages: home, `/docs`, `/pay/[id]`, `/p/[id]`, `/proof`, `/shop`, `/agent`, `/admin` (back office) | `app/` |
| Chat, Send, Deposit, Invoices, Payment links, Settings, Activity and the approval cards | `components/` |
| The API client and every type the backend returns | `lib/api/client.ts` |
| Gas sponsorship for users' wallets (only USDC and 10kobo users' wallets) | `app/api/aa/route.ts`, `lib/sponsorship.ts` |
| Real payments shown on `/proof` | `lib/proof.ts` |
| The checkout widget shops embed | `public/checkout.js` |
| Browser tests | `e2e/` |

Components use `useAuth()` and `useWallet()`. Only `lib/privy-provider.tsx` imports Privy, and
`lib/api/client.ts` knows nothing about React or Privy, so outside services can be swapped in one place.

## Disclosure

- **Built in the window.** The repository starts on 2 November 2026. Everything for NEAR comes after the
  `base-before-near` tag: [see the changes](https://github.com/blockfuselabs/10kobo-frontend/compare/base-before-near...main).
- **Earlier code.** Some wallet setup was adapted from Tokkenly, Blockfuse Labs' own earlier product. No keys, data,
  users or history were copied.
- **AI-written code.** Most of the code was written with **Claude Code** (Anthropic), directed, tested and reviewed
  by the team.
- **Libraries.** Next.js, React, Tailwind CSS, Privy, viem and permissionless. Tests: Vitest and Playwright. Fonts:
  Inter and IBM Plex Mono (SIL Open Font License, in `app/fonts`).

## License

MIT. See [LICENSE](LICENSE).
