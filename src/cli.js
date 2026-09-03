#!/usr/bin/env node
import { main } from "./cli/main.js";
import { ClawPumpError } from "./clawpump/client.js";
import { ValidationError } from "./onboarding/schema.js";

main().catch((error) => {
  process.stderr.write("\n✗ Onboarding failed.\n\n");
  if (error instanceof ValidationError) {
    process.stderr.write(`${error.issues.join("\n")}\n`);
  } else {
    process.stderr.write(`Reason: ${error.message}\n`);
  }
  if (error instanceof ClawPumpError && error.retry) {
    process.stderr.write(`\nClawPump created agent ${error.agentId ?? ""}. Retry without creating another:\n${error.retry}\n`);
  }
  process.exitCode = 1;
});
