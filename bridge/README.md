# committ-bridge

A small, always-on HTTP service that stands between the Committ web app
(deployed to Cloudflare Workers) and ClawPump's tools.

## Why this exists

ClawPump ships `@clawpump/agents` as a local **stdio MCP server**: it runs
as a subprocess your machine launches with `npx @clawpump/agents`, not as a
REST API. Cloudflare Workers cannot spawn or keep a subprocess alive, so
Committ's Worker cannot talk to ClawPump directly.

This service is the fix: it is a normal, long-running Node.js process (so it
can host that subprocess), and it exposes four small HTTP endpoints in front
of exactly the ClawPump tools Committ needs. The Worker calls this service
over plain HTTPS with a shared-secret header, the same way it would call any
other API.

```
Committ web app (Cloudflare Worker)
        │  HTTPS + Authorization: Bearer <BRIDGE_SHARED_SECRET>
        ▼
committ-bridge (this service, always-on Node process)
        │  MCP over stdio
        ▼
npx @clawpump/agents  →  ClawPump API
```

## Endpoints

All endpoints except `/health` require `Authorization: Bearer <BRIDGE_SHARED_SECRET>`.

- `GET /health` — unauthenticated liveness check.
- `POST /agents` — body `{ name, description?, imageUrl? }`. Creates one
  private ClawPump agent (= a Solana wallet) for a single repo's token.
  Returns `{ agentId, walletAddress }`. Committ shows `walletAddress` to the
  repo owner so they can fund it before launching.
- `GET /agents/:agentId` — returns the agent's current ClawPump record.
- `POST /agents/:agentId/launch` — body
  `{ name, symbol, description, imageUrl?, twitterUrl?, websiteUrl?, firstBuySol?, confirmLaunch }`.
  Calls ClawPump's `launch_metaplex_genesis_token` (the current recommended
  paid launch tool; the older `launch_token_gasless` is documented by
  ClawPump as legacy and is deliberately never called here). **This is
  irreversible and spends real SOL.** The route refuses to run unless
  `confirmLaunch === true` in the body — Committ's own API route is
  responsible for only sending that after a fresh, explicit confirmation
  from a human, not for this service to guess at.
- `GET /launches/:launchId/status` — polls ClawPump's `get_launch_status`.

Every request and response body is a plain JSON object; errors always look
like `{ "error": { "code": "...", "message": "..." } }`.

## Configuration

Copy `.env.example` to `.env` and fill in:

- `CLAWPUMP_API_KEY` — a `cpk_...` key from https://agents.clawpump.tech/dashboard/api.
  This key belongs to the bridge, not to any individual Committ user; the
  bridge acts as one ClawPump account creating one agent per repo it
  launches for.
- `BRIDGE_SHARED_SECRET` — a long random string you generate
  (`openssl rand -hex 32`). Give this same value to the Committ Worker as
  `COMMITT_BRIDGE_SHARED_SECRET`. Anyone with this value can spend the
  bridge's ClawPump agent, so store it as a secret, never in source control.
- `PORT` — local dev only; hosting platforms set this for you.

## Running locally

```bash
npm install
cp .env.example .env   # then fill in the two required values
npm run build
npm start
```

The first request that needs ClawPump will spawn `npx @clawpump/agents`
(downloading it on first run) and keep it warm for later requests. If that
subprocess ever exits, the next request respawns it automatically.

## Deploying

This is a plain Node HTTP service with one persistent process and no
database, so any small always-on Node host works. In rough order of how
little setup each needs for a hackathon deadline:

1. **Render** (Web Service, free/hobby tier) — connect the repo, root
   directory `bridge/`, build command `npm install && npm run build`,
   start command `npm start`, add the two env vars above.
2. **Railway** — same shape as Render; `railway up` from this folder also
   works if you'd rather not connect a repo.
3. **Fly.io** — `fly launch` from this folder, then `fly secrets set
   CLAWPUMP_API_KEY=... BRIDGE_SHARED_SECRET=...`.

Whichever you pick, once it's live you'll have a URL like
`https://committ-bridge.onrender.com`. Set that as `COMMITT_BRIDGE_URL` in
the Committ web app's environment (see its `.env.example`), together with
`COMMITT_BRIDGE_SHARED_SECRET` set to the same value as this service's
`BRIDGE_SHARED_SECRET`.

## What this service deliberately does NOT do

- It does not decide when a token should be launched, what a fair price or
  first-buy amount is, or how to phrase confirmation copy — that product
  logic lives in Committ's own app, matching how `chain.ts` / `errors.ts`
  keep decision logic out of transport code elsewhere in this project.
- It does not store any user data, analysis results, or transaction
  history; it is a stateless pass-through in front of ClawPump.
- It never calls the legacy `launch_token_gasless` tool.
- It never sets `is_public: true` on an agent (that requires a separately
  connected external wallet on the ClawPump account and would fail).
