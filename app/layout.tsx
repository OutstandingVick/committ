import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
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
  description: 'Paste a GitHub URL and prepare a safe, audited Solana feature for devnet.',
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
        {children}
      </body>
    </html>
  );
}
