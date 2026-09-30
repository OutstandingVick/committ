# Current project status

Last reviewed: 2026-09-28.

## Working now

- Public GitHub repository analysis and deterministic template recommendation. The primary recommendation is a fixed-supply devnet project token; the SOL tip jar remains available as a secondary action.
- Wallet Standard discovery and connection.
- Audited tip-jar initialization and tipping transaction construction.
- Repository-specific campaign PDA derivation and account validation.
- Devnet simulation, transaction review, wallet signing, confirmation polling, and Explorer links.
- Deployed Anchor program at `6NkMViXG4f2FGBMRdjEceN3fQM3fUvTbkbEo17oGRJ6y`.
- Owner-private web deployment at `https://committ.outstandingvick.chatgpt.site`.
- Hosted Blink transaction endpoint (`POST /api/actions/tip-jar`) on a dedicated Helius devnet RPC.
- First end-to-end devnet campaign (see below).
- Devnet test-token template: Token-2022 mint at a creator-and-repository seed address, name/symbol/repo metadata, fixed supply minted to the creator, mint authority revoked, no freeze authority. Simulated end to end on devnet; not yet created through a wallet.

## Resolved: hosted RPC blocker (2026-09-28)

The hosted `POST /api/actions/tip-jar` previously returned `503 DEVNET_RPC_UNAVAILABLE` because the deployment fell back to the throttled public devnet endpoint. `COMMITT_SOLANA_RPC_URL` is now set as a Sites secret pointing at a dedicated Helius devnet endpoint.

Verified from a signed-in browser session: the initialize action returned 200 with `simulation: passed`, `cluster: devnet`, and the deployed program ID, and Helius usage rose in step with repeated calls. Nothing was signed or sent.

An earlier Helius key was committed to `.openai/hosting.json` and remains in public repository history. That key has been revoked; the replacement lives only in the Sites secret. `test/secrets.test.ts` fails if an RPC key is committed again.

Specific RPC error codes (`DEVNET_RPC_UNAUTHORIZED`, `DEVNET_RPC_MISCONFIGURED`) are documented in [deployment.md](deployment.md) but not yet deployed; see the stale-code follow-up below.

## First end-to-end campaign (2026-09-28)

Run from the hosted site with a Wallet Standard wallet on devnet. Each transaction was reviewed and approved in the interface, then signed in the wallet.

| Step | Signature | Result |
|---|---|---|
| Initialize campaign `Ej3Dv3sgHxC8bt7qvn8vjruFrv75jtMv9mqZS1Zv7AcG` | [`3afVa4KR…wsyeoSLo`](https://explorer.solana.com/tx/3afVa4KRpUcjQGP5aqu6TvjPWG9Mjdhn4ivHRmrrH2xcMH37BHaECHb6XkGJ8rVtjFeYc7m7X23kT2K4wsyeoSLo?cluster=devnet) | Confirmed; campaign owned by the program, holding 1,102,360 lamports rent |
| Tip 0.001 SOL, rejected in wallet | none | UI reported "Nothing was sent"; no new signature on the wallet or campaign, campaign balance unchanged |
| Tip 0.001 SOL, approved | [`51Wc4r3F…D3ABTGX`](https://explorer.solana.com/tx/51Wc4r3FXzywAb35FBcNGnrKcRMpNGv3vFJFwB2gNGdmzXMrzT88f44pgEUjBpNNzhuPH1CDpeAuQAackD3ABTGX?cluster=devnet) | Confirmed; campaign +1,000,000 lamports, wallet −1,080,000 (tip + fee); only the wallet and campaign were writable |

### Follow-ups found during the run

- **Fee shown is lower than fee charged** (addressed). The wallet added Compute Budget instructions after review, raising the fee from 0.000005 to 0.00008 SOL. The review now labels the simulated amount as the base network fee, warns that the wallet may add a priority fee, and shows the fee actually paid, read from the confirmed transaction.
- **Wallet security warning.** The wallet warned that approving the tip could lose all funds, although the transaction only moved the tip and fee. Likely cause: the program has no reputation with the wallet's scanner. Candidate fixes: verified build (`solana-verify`), `security.txt` in the program, scanner allowlist review, and an explanatory note on the review screen.
- **Hosted code is stale.** Sites v15 reused the v14 code; GitHub `main` changes (wallet error messages, specific RPC error codes) are not deployed. Determine which source Sites builds from.

## First-transaction metric

`npm run metrics:first-tx` counts wallets whose first-ever **signed** Solana transaction was a successful Committ transaction. It is derived from public devnet history on demand: nothing is stored, logged, or collected by the app, and output is aggregate counts only. Airdrops and other transfers a wallet did not sign are ignored. Wallets whose history predates the RPC's available ledger, or exceeds the page cap, are reported as `undeterminedWallets` rather than guessed.

## Smoke test scope

`npm run smoke:blink` without `--url` proves the local `.env.local` RPC works and an initialize transaction simulates. It says nothing about the hosted environment. With `--url`, it exercises the deployed route and its configured RPC. Neither mode signs or sends.

## Deliberately not implemented

- Mainnet deployment or transactions.
- Mainnet token launches or ClawPump command execution.
- A withdrawal control in the web interface.
- Arbitrary program generation from repository content.
- Custodial wallets or server-side signing.

## Next recommended work

1. Make Sites build from GitHub `main` and publish it.
2. Resolve the wallet-warning follow-up above.
3. Add instruction-level LiteSVM tests for initialize, tip, withdrawal authorization, rent preservation, and overflow.
4. Arrange an independent program audit before discussing mainnet.

Update this file whenever a blocker is resolved or product scope changes.
