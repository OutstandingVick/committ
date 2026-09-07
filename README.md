# Committ

Paste a GitHub URL. Get a safe, live Solana feature and a token-ready launch plan in under 60 seconds.

Committ is developer onboarding as a product. It reads a small public Web2 repository, recommends one narrowly-scoped on-chain feature, and prepares an audited template for deployment. Submitted repositories are treated as untrusted data: Committ reads a bounded set of text files through GitHub's API and never clones, installs, imports, or executes repository code.

## Phase-one vertical slice

The first template is a SOL tip jar. The product flow is:

1. Read a public GitHub repository through the GitHub REST API.
2. Classify its use case using deterministic evidence.
3. Ask the developer to confirm the recommendation.
4. Connect a Wallet Standard-compatible Solana wallet.
5. Build and simulate an audited initialize or tip transaction on devnet.
6. Show the program, campaign PDA, fee payer, amount, rent, fee, and compute estimate.
7. Require explicit review before the wallet signs and sends.
8. Wait for confirmation and return a verifiable Explorer link.
9. Hand off token launch details to ClawPump when configured.

No mainnet transaction is created or sent in phase one. Committ never accepts private keys; signing belongs in the developer's wallet. The deployed devnet program is [`6NkM…GRJ6y`](https://explorer.solana.com/address/6NkMViXG4f2FGBMRdjEceN3fQM3fUvTbkbEo17oGRJ6y?cluster=devnet).

## Blink transaction path

The action endpoint is `/api/actions/tip-jar`. A prepared plan adds the repository and campaign authority to its URL. `POST` accepts only the connected wallet's public address, derives the repository-specific PDA, validates any existing campaign account, builds an unsigned versioned transaction, and simulates it against devnet. The browser displays that receipt and asks for explicit approval before handing the transaction to the wallet.

The server never broadcasts a transaction. A Wallet Standard wallet signs and sends directly, and `/api/transactions/:signature` reports confirmed or finalized chain evidence.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The GitHub token is optional for public repositories but increases API limits.

## Checks

```bash
npm run lint
npm run test
npm run build
```

`npm test` covers URL and amount validation, deterministic PDAs, IDL discriminators, account decoding, Blink descriptors, unsigned transaction compilation, and the simulation gate.

## Program workspace

The audited Anchor template lives in `programs/committ-tip-jar`. It is source-controlled and reviewed as product code; repository input can only select and parameterize it. Committ does not generate Rust from repository content.
