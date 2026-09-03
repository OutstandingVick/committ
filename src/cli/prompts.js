import { createInterface } from "node:readline/promises";

export async function collectInteractive(initial = {}, streams = {}) {
  const input = streams.input ?? process.stdin;
  const output = streams.output ?? process.stdout;
  const rl = createInterface({ input, output });
  try {
    const ask = async (key, prompt, optional = false) => {
      if (initial[key]) return initial[key];
      const answer = (await rl.question(prompt)).trim();
      return answer || (optional ? undefined : "");
    };
    return {
      ...initial,
      name: await ask("name", "Agent name: "),
      description: await ask("description", "Description: "),
      ticker: await ask("ticker", "Token ticker (max 10 letters/digits): "),
      endpoint: await ask("endpoint", "Agent API / webhook URL [optional]: ", true),
      website: await ask("website", "Website [optional]: ", true),
      twitter: await ask("twitter", "X/Twitter [optional]: ", true),
    };
  } finally {
    rl.close();
  }
}

export async function confirmLaunch(input, streams = {}) {
  const rl = createInterface({ input: streams.input ?? process.stdin, output: streams.output ?? process.stdout });
  try {
    const answer = (await rl.question("Launch this agent? (Y/n): ")).trim();
    return !/^n(o)?$/i.test(answer);
  } finally {
    rl.close();
  }
}
