'use client';

import { useWalletConnection } from '@solana/react-hooks';
import { useState } from 'react';
import { walletConnectionMessage } from '../src/solana/walletError';

export function WalletConnection() {
  const wallet = useWalletConnection();
  const [open, setOpen] = useState(false);
  const [connectionError, setConnectionError] = useState('');

  async function connect(connectorId: string) {
    setConnectionError('');
    try {
      await wallet.connect(connectorId);
      setOpen(false);
    } catch (error) {
      setConnectionError(walletConnectionMessage(error));
    }
  }

  async function disconnect() {
    setConnectionError('');
    try {
      await wallet.disconnect();
    } catch (error) {
      setConnectionError(walletConnectionMessage(error));
    }
  }

  if (!wallet.isReady) {
    return <button className="wallet-button" disabled>Finding wallets…</button>;
  }

  if (wallet.connected && wallet.wallet) {
    return (
      <div className="wallet-connected">
        <span><i />{shortAddress(wallet.wallet.account.address)}</span>
        <button type="button" onClick={() => void disconnect()}>Disconnect</button>
        {connectionError ? <p role="alert">{connectionError}</p> : null}
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
              onClick={() => void connect(connector.id)}
            >
              <span>{connector.name}</span>
              <small>{connector.ready === false ? 'Unavailable' : 'Connect'}</small>
            </button>
          )) : (
            <p>No Wallet Standard wallet was detected. Install Phantom, Backpack, or Solflare.</p>
          )}
          {connectionError || wallet.error ? (
            <p role="alert">{connectionError || walletConnectionMessage(wallet.error)}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function shortAddress(value: string): string {
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
