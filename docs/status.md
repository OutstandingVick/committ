# Current project status

Last reviewed: 2026-09-09.

## Working now

- Public GitHub repository analysis and deterministic template recommendation.
- Wallet Standard discovery and connection.
- Audited tip-jar initialization and tipping transaction construction.
- Repository-specific campaign PDA derivation and account validation.
- Devnet simulation, transaction review, wallet signing, confirmation polling, and Explorer links.
- Deployed Anchor program at `6NkMViXG4f2FGBMRdjEceN3fQM3fUvTbkbEo17oGRJ6y`.
- Owner-private web deployment at `https://committ.outstandingvick.chatgpt.site`.

## Known operational blocker

The hosted Blink descriptor (`GET /api/actions/tip-jar`) works. The hosted transaction endpoint (`POST /api/actions/tip-jar`) currently returns `503 DEVNET_RPC_UNAVAILABLE` because shared public devnet RPC endpoints throttle the Cloudflare runtime.

To unblock it, configure `COMMITT_SOLANA_RPC_URL` with a dedicated HTTPS devnet endpoint, redeploy the same application, then run the Blink smoke test and a wallet-rejection test before approving any transaction.

## Deliberately not implemented

- Mainnet deployment or transactions.
- Token creation or ClawPump command execution.
- A withdrawal control in the web interface.
- Arbitrary program generation from repository content.
- Custodial wallets or server-side signing.

## Next recommended work

1. Configure and verify a dedicated devnet RPC endpoint.
2. Create the first campaign through the wallet and record its confirmed Explorer link.
3. Add instruction-level LiteSVM tests for initialize, tip, withdrawal authorization, rent preservation, and overflow.
4. Arrange an independent program audit before discussing mainnet.

Update this file whenever a blocker is resolved or product scope changes.
