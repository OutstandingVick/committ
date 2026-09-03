export class ValidationError extends Error {
  constructor(issues) {
    super(issues.join("\n"));
    this.name = "ValidationError";
    this.issues = issues;
  }
}

export function normalizeInput(value = {}) {
  return {
    name: String(value.name ?? "").trim(),
    description: String(value.description ?? "").trim(),
    ticker: String(value.ticker ?? value.symbol ?? "").trim().toUpperCase(),
    endpoint: cleanOptional(value.endpoint),
    website: cleanOptional(value.website),
    twitter: cleanOptional(value.twitter ?? value.x),
  };
}

function cleanOptional(value) {
  const result = String(value ?? "").trim();
  return result || undefined;
}
