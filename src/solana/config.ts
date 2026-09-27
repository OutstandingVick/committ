import { address, type Address } from '@solana/kit';
import { CommittError } from '../agent/errors';

export const DEVNET_CHAIN = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1' as const;
export const DEVNET_RPC_URL = 'https://api.devnet.solana.com' as const;
export const SYSTEM_PROGRAM_ADDRESS = address('11111111111111111111111111111111');
export const DEFAULT_TIP_JAR_PROGRAM_ADDRESS = address(
  '6NkMViXG4f2FGBMRdjEceN3fQM3fUvTbkbEo17oGRJ6y',
);

export function getTipJarProgramAddress(): Address {
  return parseSolanaAddress(
    process.env.COMMITT_TIP_JAR_PROGRAM_ID ?? DEFAULT_TIP_JAR_PROGRAM_ADDRESS,
    'tip-jar program',
  );
}

export function getDevnetRpcUrl(): string {
  const configured = process.env.COMMITT_SOLANA_RPC_URL?.trim();
  if (!configured) return DEVNET_RPC_URL;

  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    throw misconfigured('The configured Solana RPC endpoint is not a valid URL.');
  }
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    throw misconfigured('The Solana RPC endpoint must use HTTPS.');
  }
  if (/(^|\.)helius-rpc\.com$/.test(parsed.hostname) && !parsed.hostname.startsWith('devnet.')) {
    throw misconfigured('The Helius RPC endpoint must be the devnet endpoint.');
  }
  return parsed.toString();
}

export function parseSolanaAddress(value: string, label = 'wallet'): Address {
  try {
    return address(value.trim());
  } catch {
    throw new Error(`The ${label} address is invalid.`);
  }
}

function misconfigured(message: string): CommittError {
  return new CommittError('DEVNET_RPC_MISCONFIGURED', message, 503);
}
