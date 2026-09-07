# Committ

Paste a GitHub URL. Get a safe, live Solana feature and a token-ready launch plan in under 60 seconds.

Committ is developer onboarding as a product. It reads a small public Web2 repository, recommends one narrowly-scoped on-chain feature, and prepares an audited template for deployment. Submitted repositories are treated as untrusted data: Committ reads a bounded set of text files through GitHub's API and never clones, installs, imports, or executes repository code.

## Phase-one vertical slice

The first template is a SOL tip jar. The product flow is:

1. Read a public GitHub repository through the GitHub REST API.
2. Classify its use case using deterministic evidence.
3. Ask the developer to confirm the recommendation.
4. Prepare the audited tip-jar deployment for Solana devnet.
5. Return plain-language logs and verifiable explorer links.
6. Hand off token launch details to ClawPump when configured.

No mainnet transaction is created or sent in phase one. Committ never accepts private keys; signing belongs in the developer's wallet.

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

## Program workspace

The audited Anchor template lives in `programs/committ-tip-jar`. It is source-controlled and reviewed as product code; repository input can only select and parameterize it. Committ does not generate Rust from repository content.
