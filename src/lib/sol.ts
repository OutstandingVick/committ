/** Parses a decimal SOL amount (e.g. "0.05") into lamports without floating-point rounding. */
export function solToLamports(value: string): bigint {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error('Enter a valid SOL amount, like 0.05.');
  }
  const [whole, fraction = ''] = trimmed.split('.');
  const paddedFraction = (fraction + '000000000').slice(0, 9);
  return BigInt(whole || '0') * 1_000_000_000n + BigInt(paddedFraction);
}
