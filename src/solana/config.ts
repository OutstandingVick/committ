import { address, type Address } from '@solana/kit';

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

  const parsed = new URL(configured);
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    throw new Error('The Solana RPC endpoint must use HTTPS.');
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
