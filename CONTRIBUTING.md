# Contributing to Committ

## Before you change code

1. Read [docs/status.md](docs/status.md) to distinguish working functionality from planned work.
2. Keep all transaction work on devnet.
3. Do not add generated Rust or let repository input influence executable code.
4. Do not add server-side signing, private keys, seed phrases, or keypair files.
5. Treat GitHub content, RPC responses, account data, and program logs as untrusted input.

## Development workflow

Create a branch from `main`, install the locked dependencies, and run the checks before opening a pull request:

```bash
npm ci
cp .env.example .env.local
npm run check
npm run check:program
```

Use `npm run check:web` while iterating on web code. Use the non-signing smoke test when changing transaction construction:

```bash
npm run smoke:blink -- <DEVNET_WALLET_ADDRESS> [GITHUB_REPOSITORY_URL]
```

The smoke test builds and simulates an initialization transaction. It never asks for a private key, signs, or broadcasts.

Anchor 0.32 may emit `unexpected cfg` warnings from its macros on Rust 1.89. They are currently known warnings; test failures are not expected.

## Where changes belong

- Repository ingestion or classification: `src/agent/`
- Audited template metadata: `src/templates/registry.ts`
- Solana client behavior: `src/solana/`
- HTTP contracts: `app/api/`
- Wallet and review experience: `components/`
- On-chain behavior: `programs/committ-tip-jar/` and the matching checked-in IDL

Do not duplicate transaction encoding inside React components or API routes. Keep it in `src/solana/` and cover it with tests.

## Pull-request checklist

- [ ] `npm run check` passes.
- [ ] `npm run check:program` passes when Rust or the IDL changed.
- [ ] New transaction behavior has validation and a simulation gate.
- [ ] Wallet rejection still reports that nothing was sent.
- [ ] No mainnet endpoint, signing material, or generated repository code was introduced.
- [ ] Documentation reflects any change to what is implemented or blocked.

Changes that introduce mainnet, token launch, program upgrades, or new templates require a separate security review and explicit release approval.
