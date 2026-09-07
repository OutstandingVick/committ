# Committ architecture

## Tool chain

```text
parse_repo_url
  -> read_repo
  -> classify_project
  -> recommend_audited_template
  -> confirm_with_user
  -> prepare_devnet_deployment
  -> prepare_token_launch
  -> report_back
```

The chain is framework-independent. The web route calls it; it does not duplicate agent logic.

## Trust boundaries

- **GitHub input:** untrusted text, read-only, bounded by allowlists and byte budgets.
- **Classifier:** produces a recommendation, never executable code.
- **Template registry:** the only source of deployable program choices.
- **Wallet:** owns signing. The server never requests seed phrases or keypairs.
- **Cluster:** devnet by default. Mainnet is intentionally unavailable in phase one.
- **ClawPump:** optional server-side adapter; every irreversible launch requires separate confirmation.

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
