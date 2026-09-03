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

export function validateInput(value) {
  const input = normalizeInput(value);
  const issues = [];

  if (!input.name) issues.push("Agent name is required.");
  if (input.name.length > 80) issues.push("Agent name must be 80 characters or fewer.");
  if (!input.description) issues.push("Description is required.");
  if (input.description.length > 1_000) issues.push("Description must be 1,000 characters or fewer.");
  if (!input.ticker) issues.push("Ticker is required by ClawPump.");
  if (input.ticker && !/^[A-Z0-9]{1,10}$/.test(input.ticker)) {
    issues.push("Ticker must contain 1-10 letters or digits.");
  }

  if (issues.length) throw new ValidationError(issues);
  return input;
}

function cleanOptional(value) {
  const result = String(value ?? "").trim();
  return result || undefined;
}
