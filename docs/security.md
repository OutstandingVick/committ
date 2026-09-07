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
- No token program, oracle, remaining accounts, or arbitrary CPI surface exists.

## Client rules

- Devnet is the only supported cluster in phase one.
- Simulate every initialization before requesting a wallet signature.
- Show program ID, authority, fee payer, cluster, and estimated fee before signing.
- Wait for confirmed status before showing explorer proof.
- Never accept, store, or log a seed phrase or keypair.

## Remaining work before mainnet

- Independent audit and remediation.
- LiteSVM instruction-level tests for initialization, tips, unauthorized withdrawals, rent-floor preservation, and overflow.
- Upgrade-authority policy and published build provenance.
- Incident response, monitoring, and pause/migration plan.
