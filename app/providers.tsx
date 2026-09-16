'use client';

import { autoDiscover, createClient } from '@solana/client';
import { SolanaClientProvider } from '@solana/react-hooks';
import { mainnet } from '@solana/kit';
import { useMemo, type ReactNode } from 'react';
import { toWebsocketUrl } from '../src/lib/solanaRpc';

export function Providers({ children, rpcUrl }: { children: ReactNode; rpcUrl: string }) {
  const client = useMemo(
    () =>
      createClient({
        cluster: 'mainnet',
        commitment: 'confirmed',
        endpoint: mainnet(rpcUrl),
        walletConnectors: autoDiscover(),
        websocketEndpoint: mainnet(toWebsocketUrl(rpcUrl)),
      }),
    [rpcUrl],
  );

  return <SolanaClientProvider client={client}>{children}</SolanaClientProvider>;
}
