'use client';

import { useWalletConnection } from '@solana/react-hooks';
import { useState } from 'react';

export function WalletConnection() {
  const wallet = useWalletConnection();
  const [open, setOpen] = useState(false);

  if (!wallet.isReady) {
    return <button className="wallet-button" disabled>Finding wallets…</button>;
  }

  if (wallet.connected && wallet.wallet) {
    return (
      <div className="wallet-connected">
        <span><i />{shortAddress(wallet.wallet.account.address)}</span>
        <button type="button" onClick={() => void wallet.disconnect()}>Disconnect</button>
      </div>
    );
  }

  return (
    <div className="wallet-picker">
      <button className="wallet-button" type="button" onClick={() => setOpen((value) => !value)}>
        Connect wallet
      </button>
      {open ? (
        <div className="wallet-menu" role="menu">
          {wallet.connectors.length ? wallet.connectors.map((connector) => (
            <button
              key={connector.id}
              type="button"
              disabled={wallet.connecting || connector.ready === false}
              onClick={() => void wallet.connect(connector.id).then(() => setOpen(false))}
            >
              <span>{connector.name}</span>
              <small>{connector.ready === false ? 'Unavailable' : 'Connect'}</small>
            </button>
          )) : (
            <p>No Wallet Standard wallet was detected. Install Phantom, Backpack, or Solflare.</p>
          )}
          {wallet.error ? <p role="alert">The wallet connection was declined or unavailable.</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function shortAddress(value: string): string {
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
