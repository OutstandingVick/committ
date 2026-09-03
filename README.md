# Rappen

Rappen is a thin onboarding layer for bringing AI agents onto ClawPump and
Solana. It validates a small metadata set, delegates the real launch, and keeps
a local proof record.

## Onboard an Agent

### Prerequisites

- Node.js 20 or newer
- npm/npx
- A browser for the first ClawPump Google sign-in
- An available sponsored ClawPump launch, or the funding ClawPump requests

No wallet private key or ClawPump credential belongs in this repository. The
official CLI owns authentication and caches its session in `~/.clawpump`.

```bash
git clone https://github.com/OutstandingVick/rappen.git
cd rappen
npm install
cp .env.example .env
npm run onboard
```

Rappen asks for the agent name, description, ticker, and optional endpoint,
website, and X/Twitter URL. Review the values and confirm the irreversible
launch. On first use, ClawPump opens a browser for sign-in.

Config-file mode:

```bash
npm run onboard -- --config ./examples/atlas.json
```

Non-interactive mode requires explicit confirmation:

```bash
npm run onboard -- \
  --name "Atlas" \
  --description "Autonomous DeFi research agent." \
  --ticker ATLAS \
  --endpoint "https://atlas.example/api" \
  --yes
```

After a confirmed real launch, Rappen prints only artifacts returned by
ClawPump and appends a record to `data/onboarded-agents.json`. The current CLI
returns the ClawPump agent ID, token symbol, mint address, ClawPump URL, and
pump.fun URL. It does not return the agent wallet or transaction signature.

Rappen does not deploy tokens independently. Agent tokenization is performed
through ClawPump's launch infrastructure.

## Integration

Rappen pins and spawns the official non-interactive command:

```bash
npx --yes clawpump@0.10.0 launch \
  --name "Atlas" --ticker ATLAS --json --yes --no-reinvest
```

`--no-reinvest` prevents the upstream CLI's optional post-launch trading
automation. Agent description and URLs are retained in Rappen's registry but
are not forwarded because ClawPump CLI v0.10.0 does not accept those fields.
See `docs/clawpump-integration.md` for the verified boundary and limitations.

## Verification

```bash
npm run lint
npm test
npm pack --dry-run
```

Tests mock ClawPump and never deploy a token.
