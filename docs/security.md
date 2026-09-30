# Tip-jar security review

Status: internal template review. This is not an independent audit and must not be promoted to mainnet before one.

## Enforced invariants

- Campaign creation uses `init`, not `init_if_needed`, preventing reinitialization.
- Campaign PDAs include the authority and repository hash, preventing cross-user sharing.
- The canonical bump is recorded and validated on every later instruction.
- Authority is a required signer and `has_one` binds withdrawal to stored state.
- The System Program is typed, preventing arbitrary CPI substitution.
- Deposits use the System Program transfer instruction; withdrawals modify only the program-owned campaign and recorded authority.
- Rent-exempt lamports remain in the campaign account.
- Tip and withdrawal accounting uses checked addition.
- Zero-value instructions are rejected.
- The tip-jar program has no token program, oracle, remaining accounts, or arbitrary CPI surface.

## Client rules

- Devnet is the only supported cluster in phase one.
- Simulate every initialization before requesting a wallet signature.
- Show program ID, authority, fee payer, cluster, and estimated fee before signing.
- Wait for confirmed status before showing explorer proof.
- Never accept, store, or log a seed phrase or keypair.
- Reject tips outside 0.001–10 devnet SOL and decimal inputs beyond lamport precision.
- Validate campaign owner, exact account length, Anchor discriminator, authority, and repository hash.
- Return an unsigned transaction only after `simulateTransaction` succeeds with signature verification disabled.
- Require a separate in-product approval after simulation and before invoking the wallet.
- Rate-limit transaction construction and cap JSON request bodies.

## Devnet token rules

- Use only the standard System, Token-2022, and Associated Token Account programs; no custom token program.
- Only the creator wallet signs: the mint is a seed-derived address, never a generated keypair.
- Mint the full supply once, then revoke mint authority in the same transaction. Never set a freeze authority.
- Refuse to build if the creator already has a token for the repository.
- Validate name (1-32 bytes), symbol (1-10 letters or digits), and supply (1 to 1,000,000,000 whole tokens).
- The browser refuses any token review that is not devnet, simulated, Token-2022, paid by the connected wallet, and supply-locked.
- Label tokens as the creator's own devnet test token, not an official token of the repository.
- Description (up to 160 bytes) and image URL (HTTPS only, no credentials, up to 160 bytes) are stored on-chain as metadata fields; the transaction is refused if it would exceed 1,232 bytes.
- `/api/token-metadata` only serves JSON for mints whose on-chain URI points to it, re-validates image and repository URLs as HTTPS, and stores nothing.

## Signing boundary

Committ receives public addresses only. The API constructs but never signs or broadcasts. The browser decodes the returned wire transaction at the Wallet Standard adapter boundary, enforces the transaction size limit, and asks the selected wallet to sign and send on `solana:devnet`. A returned signature is treated as pending until the confirmation endpoint observes `confirmed` or `finalized` status.

## Remaining work before mainnet

- Independent audit and remediation.
- LiteSVM instruction-level tests for initialization, tips, unauthorized withdrawals, rent-floor preservation, and overflow.
- Upgrade-authority policy and published build provenance.
- Incident response, monitoring, and pause/migration plan.
