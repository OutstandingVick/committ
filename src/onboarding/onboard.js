import { randomUUID } from "node:crypto";
import { launchAgent } from "../clawpump/client.js";
import { validateInput } from "./schema.js";
import { saveOnboarding } from "./store.js";

export async function onboardAgent(value, dependencies = {}) {
  const input = validateInput(value);
  const launch = await (dependencies.launchAgent ?? launchAgent)(input);
  const record = {
    id: (dependencies.randomUUID ?? randomUUID)(),
    ...input,
    agentId: launch.agentId,
    tokenMint: launch.tokenMint,
    tokenSymbol: launch.tokenSymbol ?? input.ticker,
    dashboardUrl: launch.dashboardUrl,
    pumpUrl: launch.pumpUrl,
    onboardedAt: (dependencies.now ?? (() => new Date()))().toISOString(),
  };

  await (dependencies.saveOnboarding ?? saveOnboarding)(record, dependencies.registryPath);
  return record;
}
