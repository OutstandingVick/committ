# ClawPump integration note

Rappen delegates all agent creation, wallet provisioning, and token deployment to
the official `clawpump` npm CLI. The verified integration target is
`clawpump@0.10.0`.

The CLI supports a non-interactive launch with `--name`, `--ticker`, `--yes`, and
`--json`. Rappen invokes that surface and parses its final JSON line. Successful
output exposes the agent ID, mint address, ClawPump token URL, and pump.fun URL.
It does not currently expose a wallet address or transaction signature, so
Rappen does not invent or display either value.

Authentication remains owned by ClawPump. On first use, its CLI opens a browser
for Google sign-in and stores a session under `~/.clawpump`. Rappen never reads
or persists that credential.

The documented `@clawpump/sdk` package was not available from npm when this
integration was built, making the official CLI the smallest reliable boundary.
