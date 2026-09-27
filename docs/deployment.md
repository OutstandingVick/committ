# Deployment runbook

## Web application

Required production configuration:

- `GITHUB_TOKEN`: read-only GitHub token for reliable public API limits.
- `COMMITT_GITHUB_API_URL`: defaults to `https://api.github.com`.
- `COMMITT_SOLANA_RPC_URL`: a dedicated, trusted devnet HTTPS RPC endpoint. Shared public endpoints are not reliable enough for the hosted worker. For Helius use the **devnet** URL, `https://devnet.helius-rpc.com/?api-key=<KEY>`; Helius mainnet hosts are rejected. Store it as a secret in the Sites production environment. When unset, the app silently falls back to `https://api.devnet.solana.com`.
- `COMMITT_TIP_JAR_PROGRAM_ID`: optional override for a different verified devnet program. The current deployed ID is the app default.

Copy `.env.example` to `.env.local` for local development. Hosted values belong in the Sites environment and must not be committed.

The Sites project is recorded in `.openai/hosting.json`. After changing hosted environment values, publish a new version so the new environment revision is applied. Never put RPC credentials in the manifest, Git configuration, or committed files.

## Diagnosing hosted RPC failures

The POST route distinguishes RPC failures so one smoke run identifies the cause:

| Response | Meaning | Fix |
|---|---|---|
| `503 DEVNET_RPC_UNAVAILABLE` after ~3.5 s, provider dashboard shows no requests | The variable is not reaching the deployment; it is using the public fallback | Set it in the production environment and publish a new version |
| `503 DEVNET_RPC_UNAVAILABLE`, provider dashboard shows 429s | Genuine provider rate limit | Check plan limits |
| `503 DEVNET_RPC_UNAUTHORIZED` (fast) | The endpoint rejected the key | Re-copy the devnet URL including `api-key` |
| `503 DEVNET_RPC_MISCONFIGURED` (fast) | Invalid, non-HTTPS, unreachable, or non-devnet Helius URL | Correct the URL shape |

Error messages never include the endpoint URL or key.

## Program release gate

1. Run `NO_DNA=1 anchor build` and archive the generated IDL and binary hash.
2. Run instruction-level LiteSVM tests and complete an independent audit.
3. Display the target cluster, program ID, authority, fee payer, and estimated cost.
4. Simulate the deployment.
5. Obtain explicit human approval before signing or broadcasting.
6. Wait for confirmed finality and verify the executable account in Solana Explorer.
7. If the program ID changed, set `COMMITT_TIP_JAR_PROGRAM_ID` to the new verified devnet address.

Current verified devnet program: `6NkMViXG4f2FGBMRdjEceN3fQM3fUvTbkbEo17oGRJ6y`.

The web client currently exposes initialize and tip only. Withdrawal exists in the program but has no web transaction path.

## Blink release gate

1. Run `npm run check` and confirm `npm audit` reports no known vulnerabilities.
2. Call the initialize action with a funded devnet public address and verify simulation passes; do not sign during smoke testing. `npm run smoke:blink -- <WALLET>` runs the route in-process with `.env.local` and verifies only the local configuration. Add `--url <HOSTED_ORIGIN>` to POST to the deployment itself; an owner-private deployment may instead require running the same POST from a signed-in browser session.
3. Confirm the response identifies devnet, the deployed program, campaign PDA, fee payer, rent, fee, and compute use.
4. Test wallet rejection and ensure the UI reports that nothing was sent.
5. Send only after a human checks the transaction-review box in the interface.
6. Verify the resulting signature through `/api/transactions/:signature` and Solana Explorer.

No step in the web analysis route has permission to deploy, sign, or launch a token. Mainnet remains out of scope until the audit and a separate release approval.
