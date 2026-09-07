'use client';

import { autoDiscover, createClient } from '@solana/client';
import { SolanaClientProvider } from '@solana/react-hooks';
import { devnet } from '@solana/kit';
import type { ReactNode } from 'react';
import { DEVNET_RPC_URL } from '../src/solana/config';

const client = createClient({
  cluster: 'devnet',
  commitment: 'confirmed',
  endpoint: devnet(DEVNET_RPC_URL),
  walletConnectors: autoDiscover(),
  websocketEndpoint: devnet('wss://api.devnet.solana.com'),
});

export function Providers({ children }: { children: ReactNode }) {
  return <SolanaClientProvider client={client}>{children}</SolanaClientProvider>;
}
