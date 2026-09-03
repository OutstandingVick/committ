import { parseArguments, loadInput } from "./arguments.js";
import { collectInteractive, confirmLaunch } from "./prompts.js";
import { validateInput } from "../onboarding/schema.js";
import { onboardAgent } from "../onboarding/onboard.js";

export async function main(argv = process.argv.slice(2), io = {}) {
  const output = io.output ?? process.stdout;
  const { command, values } = parseArguments(argv);
  if (command !== "onboard") throw new Error(`Unknown command: ${command}`);

  output.write("\nWelcome to Rappen.\n\nLet's bring your agent onchain.\n\n");
  let input = await loadInput(values);
  if (io.interactive ?? (process.stdin.isTTY && process.stdout.isTTY)) {
    input = await collectInteractive(input, io);
  }
  input = validateInput(input);

  output.write("\nReview:\n\n");
  output.write(`Name: ${input.name}\nDescription: ${input.description}\nTicker: ${input.ticker}\n`);
  if (input.endpoint) output.write(`Endpoint: ${input.endpoint}\n`);
  if (input.website) output.write(`Website: ${input.website}\n`);
  if (input.twitter) output.write(`X: ${input.twitter}\n`);
  output.write("\n");

  if (!values.yes) {
    if (!(io.interactive ?? (process.stdin.isTTY && process.stdout.isTTY))) {
      throw new Error("Non-interactive launches require --yes because token deployment is irreversible.");
    }
    if (!(await confirmLaunch(input, io))) {
      output.write("Cancelled. Nothing was launched.\n");
      return null;
    }
  }

  output.write(`Launching ${input.name} through ClawPump...\n`);
  return onboardAgent(input, io.dependencies);
}
