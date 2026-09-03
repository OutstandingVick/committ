import assert from "node:assert/strict";
import { readFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { ClawPumpError, launchAgent, parseLaunchOutput, toClawPumpArgs } from "../src/clawpump/client.js";
import { onboardAgent } from "../src/onboarding/onboard.js";
import { ValidationError, validateInput } from "../src/onboarding/schema.js";

const validInput = {
  name: "Atlas",
  description: "Autonomous DeFi research agent.",
  ticker: "atlas",
  endpoint: "https://atlas.example/api",
};

test("validates and normalizes onboarding metadata", () => {
  assert.equal(validateInput(validInput).ticker, "ATLAS");
  assert.throws(() => validateInput({ ...validInput, endpoint: "not-a-url" }), ValidationError);
  assert.throws(() => validateInput({ ...validInput, description: "" }), /Description is required/);
});

test("transforms config into the supported ClawPump CLI invocation", () => {
  assert.deepEqual(toClawPumpArgs(validateInput(validInput)), [
    "--yes", "clawpump@0.10.0", "launch", "--name", "Atlas", "--ticker", "ATLAS", "--json", "--no-reinvest",
  ]);
});

test("parses the final machine-readable ClawPump result", () => {
  const result = parseLaunchOutput(`progress\n${JSON.stringify({
    status: "launched",
    symbol: "ATLAS",
    agentId: "agent-1",
    mintAddress: "mint-1",
    clawpumpUrl: "https://clawpump.tech/tokens/mint-1",
  })}\n`);
  assert.equal(result.tokenMint, "mint-1");
  assert.equal(result.dashboardUrl, "https://clawpump.tech/tokens/mint-1");
});

test("turns an incomplete launch into an actionable failure", async () => {
  const run = async () => ({
    code: 0,
    stderr: "",
    stdout: JSON.stringify({ status: "needs_funding", agentId: "agent-1", message: "Fund wallet", retry: "npx clawpump launch --agent-id agent-1 --paid" }),
  });
  await assert.rejects(
    launchAgent(validateInput(validInput), { run }),
    (error) => error instanceof ClawPumpError && error.retry.includes("agent-1"),
  );
});

test("persists a successful onboarding result", async () => {
  const directory = await mkdtemp(join(tmpdir(), "rappen-test-"));
  const registryPath = join(directory, "agents.json");
  const launch = async () => ({
    status: "launched",
    agentId: "agent-1",
    tokenSymbol: "ATLAS",
    tokenMint: "mint-1",
    dashboardUrl: "https://clawpump.tech/tokens/mint-1",
  });
  const record = await onboardAgent(validInput, {
    launchAgent: launch,
    registryPath,
    randomUUID: () => "record-1",
    now: () => new Date("2026-09-03T12:00:00.000Z"),
  });
  const stored = JSON.parse(await readFile(registryPath, "utf8"));
  assert.equal(record.id, "record-1");
  assert.deepEqual(stored, [JSON.parse(JSON.stringify(record))]);
});
