const WINDOW_MS = 60_000;
const MAX_REQUESTS = 8;
const buckets = new Map<string, number[]>();

export function consumeRateLimit(key: string, now = Date.now()): boolean {
  const active = (buckets.get(key) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);
  if (active.length >= MAX_REQUESTS) {
    buckets.set(key, active);
    return false;
  }
  active.push(now);
  buckets.set(key, active);
  return true;
}
