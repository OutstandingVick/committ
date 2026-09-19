import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
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
  applicationName: 'Committ',
  title: {
    default: 'Committ',
    template: '%s · Committ',
  },
  description: 'Paste a GitHub URL and prepare a safe, audited Solana feature for devnet.',
  manifest: '/site.webmanifest',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'Committ — Ship the useful part onchain',
    description: 'Turn a small Web2 repository into a safe, audited Solana feature.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Committ — Ship the useful part onchain',
    description: 'Turn a small Web2 repository into a safe, audited Solana feature.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
