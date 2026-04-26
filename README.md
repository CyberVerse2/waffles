# Waffles v2

Next.js prototype for the Waffles v2 World App.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

World wallet auth uses MiniKit and NextAuth. Set `AUTH_SECRET`,
`HMAC_SECRET_KEY`, and `NEXT_PUBLIC_WORLD_APP_ID` before testing inside World App.
