# 10kobo frontend

Next.js web app. Project rules and decisions are in the parent folder's `AGENTS.md`.

## Run it

```
cp .env.example .env.local   # then fill in the Privy App ID
npm install
npm run dev                  # http://localhost:3010
```

The backend must be running too. See `10kobo-backend`.

## Check it

```
npm test
npm run build
npm run typecheck
```

## How outside services stay swappable

Components use `useAuth()` and `useWallet()`. Only `lib/privy-provider.tsx` imports Privy, so changing
provider means rewriting that one file. `lib/api/client.ts` knows nothing about React or Privy. Nothing
here depends on a hosting company; hosting is not decided yet.
