# Committ architecture

## Tool chain

```text
parse_repo_url
  -> read_repo
  -> classify_project
  -> recommend_audited_template
  -> confirm_with_user
  -> prepare_devnet_deployment
  -> connect_wallet_standard_wallet
  -> build_unsigned_transaction
  -> simulate_on_devnet
  -> human_transaction_review
  -> wallet_sign_and_send
  -> confirm_and_link_explorer
  -> prepare_token_launch
  -> report_back
```

The chain is framework-independent. The web route calls it; it does not duplicate agent logic.

## Trust boundaries

- **GitHub input:** untrusted text, read-only, bounded by allowlists and byte budgets.
- **Classifier:** produces a recommendation, never executable code.
- **Template registry:** the only source of deployable program choices.
- **Wallet:** owns signing. The server never requests seed phrases or keypairs.
- **Blink API:** returns only unsigned, short-lived transactions after a successful simulation.
- **Campaign account:** owner, discriminator, byte length, repository hash, and authority are validated before tips.
- **Cluster:** devnet by default. Mainnet is intentionally unavailable in phase one.
- **Devnet token:** one wallet-signed Token-2022 transaction. The mint address is derived with `createAccountWithSeed` from the creator wallet and a repository-hash seed, so no mint keypair exists and only the wallet signs. The transaction initializes a metadata pointer and in-mint metadata (name, symbol, canonical repository URL), mints a fixed supply to the creator's associated token account, then revokes mint authority. No freeze authority is set.
- **ClawPump:** planning-only naming draft. No provider command, authentication, or mainnet token execution exists.

## First template

The tip-jar program creates one campaign PDA per developer and repository. Anyone can send SOL to the campaign vault. Only the recorded authority can withdraw, and arithmetic uses checked operations. The template has no arbitrary CPI surface.

## Sixty-second budget

| Stage | Target |
| --- | ---: |
| URL validation | < 50 ms |
| GitHub reads | < 4 s |
| Classification | < 1 s deterministic, < 5 s with model enrichment |
| Confirmation | user-controlled |
| Deployment preparation | < 1 s |
| Devnet confirmation | cluster-dependent |

The UI reports real elapsed time and never claims a deployment succeeded before confirmed chain evidence exists.

## Transaction boundary

The API derives campaign PDAs from `campaign + authority + SHA-256(canonical repository URL)`. Initialize transactions require the connected account to equal the campaign authority. Tip transactions require an explicit authority in the shareable Blink URL and validate the fetched campaign before serialization. Transactions use a fresh confirmed blockhash and carry no server signature.
