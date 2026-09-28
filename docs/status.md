# Current project status

Last reviewed: 2026-09-28.

## Working now

- Public GitHub repository analysis and deterministic template recommendation.
- Wallet Standard discovery and connection.
- Audited tip-jar initialization and tipping transaction construction.
- Repository-specific campaign PDA derivation and account validation.
- Devnet simulation, transaction review, wallet signing, confirmation polling, and Explorer links.
- Deployed Anchor program at `6NkMViXG4f2FGBMRdjEceN3fQM3fUvTbkbEo17oGRJ6y`.
- Owner-private web deployment at `https://committ.outstandingvick.chatgpt.site`.
- Hosted Blink transaction endpoint (`POST /api/actions/tip-jar`) on a dedicated Helius devnet RPC.

## Resolved: hosted RPC blocker (2026-09-28)

The hosted `POST /api/actions/tip-jar` previously returned `503 DEVNET_RPC_UNAVAILABLE` because the deployment fell back to the throttled public devnet endpoint. `COMMITT_SOLANA_RPC_URL` is now set as a Sites secret pointing at a dedicated Helius devnet endpoint.

Verified from a signed-in browser session: the initialize action returned 200 with `simulation: passed`, `cluster: devnet`, and the deployed program ID, and Helius usage rose in step with repeated calls. Nothing was signed or sent.

An earlier Helius key was committed to `.openai/hosting.json` and remains in public repository history. That key has been revoked; the replacement lives only in the Sites secret. `test/secrets.test.ts` fails if an RPC key is committed again.

The hosted site still runs the pre-merge build; publish from `main` to ship the wallet error messages and specific RPC error codes (`DEVNET_RPC_UNAUTHORIZED`, `DEVNET_RPC_MISCONFIGURED`; see [deployment.md](deployment.md)).

## Smoke test scope

`npm run smoke:blink` without `--url` proves the local `.env.local` RPC works and an initialize transaction simulates. It says nothing about the hosted environment. With `--url`, it exercises the deployed route and its configured RPC. Neither mode signs or sends.

## Deliberately not implemented

- Mainnet deployment or transactions.
- Token creation or ClawPump command execution.
- A withdrawal control in the web interface.
- Arbitrary program generation from repository content.
- Custodial wallets or server-side signing.

## Next recommended work

1. Publish the current `main` to the hosted site.
2. Create the first campaign through the wallet, record its confirmed Explorer link, and verify a wallet rejection broadcasts nothing.
3. Add instruction-level LiteSVM tests for initialize, tip, withdrawal authorization, rent preservation, and overflow.
4. Arrange an independent program audit before discussing mainnet.

Update this file whenever a blocker is resolved or product scope changes.
