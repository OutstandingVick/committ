import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const DEFAULT_REGISTRY_PATH = resolve("data/onboarded-agents.json");

export async function saveOnboarding(record, registryPath = DEFAULT_REGISTRY_PATH) {
  let records = [];
  try {
    const parsed = JSON.parse(await readFile(registryPath, "utf8"));
    if (!Array.isArray(parsed)) throw new Error("registry root must be an array");
    records = parsed;
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw new Error(`Could not read onboarding registry: ${error.message}`, { cause: error });
    }
  }

  records.push(record);
  await mkdir(dirname(registryPath), { recursive: true });
  const temporaryPath = `${registryPath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(records, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, registryPath);
  return record;
}
