import { spawn } from "node:child_process";

export const CLAWPUMP_VERSION = "0.10.0";

export function toClawPumpArgs(input) {
  return [
    "--yes",
    `clawpump@${CLAWPUMP_VERSION}`,
    "launch",
    "--name",
    input.name,
    "--ticker",
    input.ticker,
    "--json",
    "--no-reinvest",
  ];
}
