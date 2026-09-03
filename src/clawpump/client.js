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

export function parseLaunchOutput(stdout) {
  const lines = String(stdout).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      const value = JSON.parse(lines[index]);
      if (value && typeof value === "object") {
        return {
          status: value.status,
          agentId: value.agentId,
          tokenSymbol: value.symbol,
          tokenMint: value.mintAddress ?? undefined,
          dashboardUrl: value.clawpumpUrl ?? undefined,
          pumpUrl: value.pumpUrl ?? undefined,
          raw: value,
        };
      }
    } catch {
      // ClawPump can emit progress before its final JSON result.
    }
  }
  throw new ClawPumpError("ClawPump returned no machine-readable launch result.");
}

export class ClawPumpError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = "ClawPumpError";
  }
}

export async function launchAgent(input, options = {}) {
  const run = options.run ?? runCommand;
  const command = options.command ?? "npx";
  const result = await run(command, toClawPumpArgs(input), options);
  return parseLaunchOutput(result.stdout);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: options.env ?? process.env,
      stdio: ["inherit", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}
