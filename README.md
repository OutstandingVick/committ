# Committ

Paste a public GitHub repository URL, identify one useful on-chain feature, and prepare a safe Solana transaction from an audited template.

The current MVP supports one template: a SOL tip jar on **Solana devnet**. Committ analyzes a bounded set of repository files, derives a repository-specific campaign PDA, builds and simulates an unsigned transaction, and asks the connected wallet to review, sign, and send it. Repository code is never cloned or executed, and private keys never reach the server.

> **Current status:** the program and application are deployed, but the hosted Blink POST route still needs a dedicated devnet RPC endpoint. Token launch and mainnet deployment are not implemented. Read [docs/status.md](docs/status.md) before starting work.

## Start here

### Requirements

- Node.js 22.13 or newer
- npm 10 or newer
- A Wallet Standard-compatible Solana wallet for browser testing
- Rust 1.89 for program tests; Solana CLI and Anchor 0.32.1 for program builds or deployments

### Run the web application

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open the local URL printed by Vinext. A GitHub token is optional for public repositories, but a dedicated devnet RPC endpoint is strongly recommended because public endpoints are heavily rate-limited.

### Validate your changes

```bash
npm run check
npm run check:program
```

To exercise transaction construction and simulation without signing or sending anything:

```bash
npm run smoke:blink -- <DEVNET_WALLET_ADDRESS> [GITHUB_REPOSITORY_URL]
```

The repository URL defaults to `https://github.com/OutstandingVick/committ`.

## What is implemented

1. Read a public GitHub repository through the GitHub REST API.
2. Classify it using deterministic evidence and recommend an audited template.
3. Require the developer to confirm the recommendation and connect a wallet.
4. Build and simulate an initialize or tip transaction on devnet.
5. Display the program, campaign PDA, fee payer, amount, rent, fee, and compute estimate.
6. Require explicit approval before the wallet signs and sends.
7. Poll confirmation and provide a Solana Explorer link.

The deployed devnet program is [`6NkM…GRJ6y`](https://explorer.solana.com/address/6NkMViXG4f2FGBMRdjEceN3fQM3fUvTbkbEo17oGRJ6y?cluster=devnet).

## Repository map

| Path | Purpose |
| --- | --- |
| `app/` | Vinext pages and HTTP API routes |
| `components/` | Wallet, analysis, deployment review, and transaction UI |
| `src/agent/` | Repository analysis and deployment-plan logic |
| `src/solana/` | PDA derivation, instruction encoding, RPC, simulation, and transaction clients |
| `src/templates/` | Fixed allowlist of audited program templates |
| `programs/committ-tip-jar/` | Anchor tip-jar program |
| `idl/` | Checked-in interface for the deployed program |
| `test/` | Web and Solana client tests |
| `docs/` | Status, architecture, deployment, and security notes |

## Important boundaries

- The Blink server returns unsigned transactions; the wallet owns signing and broadcasting.
- Every prepared transaction must pass devnet simulation first.
- Mainnet is deliberately unavailable.
- ClawPump output is a planning object only. No token-launch command is executed.
- The program contains a withdrawal instruction, but the web client does not expose withdrawal yet.
- The template has received an internal review, not an independent audit.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, [docs/architecture.md](docs/architecture.md) for system boundaries, and [docs/deployment.md](docs/deployment.md) for release steps.
