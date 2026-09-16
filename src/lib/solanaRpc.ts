/**
 * Committ's own wallet-connect provider talks to Solana mainnet directly
 * (see app/providers.tsx) - it is only used to show a connected wallet and
 * its address, never to sign a custom program transaction. Every actual
 * launch or trade goes through ClawPump's own tools (see ./clawpump.ts),
 * which run behind committ-bridge, not through this RPC connection.
 */

export const MAINNET_RPC_URL = 'https://api.mainnet-beta.solana.com' as const;

export function getSolanaRpcUrl(): string {
  const configured = process.env.COMMITT_SOLANA_RPC_URL?.trim();
  if (!configured) return MAINNET_RPC_URL;

  const parsed = new URL(configured);
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
    throw new Error('The Solana RPC endpoint must use HTTPS.');
  }
  return parsed.toString();
}

/** Same host and path as the given HTTP(S) RPC URL, over the matching ws(s) scheme. */
export function toWebsocketUrl(httpUrl: string): string {
  const url = new URL(httpUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}
