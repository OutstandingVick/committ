import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { getSolanaRpcUrl } from '../src/lib/solanaRpc';
import { Providers } from './providers';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Committ — Ship the useful part onchain',
  description: 'Connect GitHub and a wallet. Committ drafts a ClawPump token for your repo and launches it once you confirm.',
  openGraph: {
    title: 'Committ — Ship the useful part onchain',
    description: 'Committ reads your GitHub repos, drafts a ClawPump token identity, and launches it once you confirm.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Committ — Ship the useful part onchain',
    description: 'Committ reads your GitHub repos, drafts a ClawPump token identity, and launches it once you confirm.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Resolved on the server so a real COMMITT_SOLANA_RPC_URL actually reaches
  // the wallet client, instead of the client bundle silently always hitting
  // the public (heavily throttled) endpoint.
  const rpcUrl = getSolanaRpcUrl();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers rpcUrl={rpcUrl}>{children}</Providers>
      </body>
    </html>
  );
}
