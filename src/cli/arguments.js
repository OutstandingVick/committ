import { readFile } from "node:fs/promises";

const VALUE_FLAGS = new Set(["name", "description", "ticker", "endpoint", "website", "twitter", "config"]);

export function parseArguments(argv) {
  const args = [...argv];
  const command = args[0] && !args[0].startsWith("-") ? args.shift() : "onboard";
  const values = {};
  for (let index = 0; index < args.length; index += 1) {
    const item = args[index];
    if (item === "--yes" || item === "-y") {
      values.yes = true;
      continue;
    }
    if (!item.startsWith("--") || !VALUE_FLAGS.has(item.slice(2))) {
      throw new Error(`Unknown option: ${item}`);
    }
    const value = args[++index];
    if (!value || value.startsWith("--")) throw new Error(`${item} requires a value.`);
    values[item.slice(2)] = value;
  }
  return { command, values };
}

export async function loadInput(values) {
  if (!values.config) return values;
  try {
    const config = JSON.parse(await readFile(values.config, "utf8"));
    return { ...config, ...Object.fromEntries(Object.entries(values).filter(([key]) => key !== "config")) };
  } catch (error) {
    throw new Error(`Could not load config ${values.config}: ${error.message}`, { cause: error });
  }
}
