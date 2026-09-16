'use client';

import { useEffect, useState } from 'react';
import { useWalletConnection } from '@solana/react-hooks';
import type { AgentPortfolio, BillingBalance, WithdrawResult } from '../src/domain/committ';
import { postJson } from '../src/lib/apiClient';

/**
 * Shows an agent wallet's live balance and P&L, and a one-click withdraw:
 * everything in the wallet gets sent straight to the connected wallet, no
 * separate approval step, since it only ever moves funds to their owner.
 */
export function AgentWalletPanel({ agentId, agentWalletAddress }: { agentId: string; agentWalletAddress: string }) {
  const wallet = useWalletConnection();
  const [portfolio, setPortfolio] = useState<AgentPortfolio | null>(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [portfolioError, setPortfolioError] = useState('');

  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState<WithdrawResult | null>(null);
  const [withdrawError, setWithdrawError] = useState('');

  const [billing, setBilling] = useState<BillingBalance | null>(null);
  const [billingError, setBillingError] = useState('');
  const [syncing, setSyncing] = useState(false);

  async function loadBalance() {
    setBillingError('');
    try {
      const data = await postJson<BillingBalance>('/api/wallet/balance', { agentId }, 'Could not load ClawPump credit balance.');
      setBilling(data);
    } catch (cause) {
      setBillingError(cause instanceof Error ? cause.message : 'Could not load ClawPump credit balance.');
    }
  }

  async function syncBilling() {
    setSyncing(true);
    setBillingError('');
    try {
      const data = await postJson<BillingBalance>('/api/wallet/sync-billing', { agentId }, 'Could not sync billing.');
      setBilling(data);
    } catch (cause) {
      setBillingError(cause instanceof Error ? cause.message : 'Could not sync billing.');
    } finally {
      setSyncing(false);
    }
  }

  async function loadPortfolio() {
    setLoadingPortfolio(true);
    setPortfolioError('');
    try {
      const data = await postJson<AgentPortfolio>('/api/wallet/portfolio', { agentId }, 'Could not load wallet balance.');
      setPortfolio(data);
    } catch (cause) {
      setPortfolioError(cause instanceof Error ? cause.message : 'Could not load wallet balance.');
    } finally {
      setLoadingPortfolio(false);
    }
  }

  useEffect(() => {
    void loadPortfolio();
    void loadBalance();
    // Only re-fetch when the agent itself changes - these are stable enough
    // for this component's lifetime, and re-running on every render would
    // just spam the bridge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  async function withdrawFunds() {
    const destination = wallet.wallet?.account.address;
    if (!destination) return;
    setWithdrawing(true);
    setWithdrawError('');
    setWithdrawResult(null);
    try {
      const result = await postJson<WithdrawResult>(
        '/api/wallet/withdraw',
        { agentId, destination },
        'Withdrawal failed.',
      );
      setWithdrawResult(result);
      void loadPortfolio();
    } catch (cause) {
      setWithdrawError(cause instanceof Error ? cause.message : 'Withdrawal failed.');
    } finally {
      setWithdrawing(false);
    }
  }

  const pnl = portfolio?.totalPnlUsd ?? null;
  const pnlClass = pnl == null ? '' : pnl >= 0 ? 'pnl-positive' : 'pnl-negative';

  return (
    <div className="agent-wallet-panel">
      <div className="agent-wallet-head">
        <span>Agent wallet</span>
        <code>{agentWalletAddress}</code>
      </div>

      <div className="billing-row">
        <span>ClawPump credits: {billing?.balanceUsd != null ? `$${billing.balanceUsd.toFixed(2)}` : '—'}</span>
        <button type="button" onClick={syncBilling} disabled={syncing}>
          {syncing ? 'Syncing…' : 'Sync billing →'}
        </button>
      </div>
      {billingError ? <p className="form-message form-error" role="alert">{billingError}</p> : null}
      <p className="fund-alt">
        This is ClawPump’s own balance for running agent actions (creating a wallet, launching) - separate from the SOL/tokens below. “Payment required” errors mean this is empty; top up at{' '}
        <a href="https://agents.clawpump.tech/dashboard/credits" target="_blank" rel="noreferrer">agents.clawpump.tech/dashboard/credits</a>, then sync above.
      </p>

      {loadingPortfolio ? (
        <p className="form-message">Loading balance…</p>
      ) : portfolioError ? (
        <p className="form-message form-error" role="alert">{portfolioError}</p>
      ) : portfolio ? (
        <>
          <div className="agent-wallet-totals">
            <div>
              <span>Value</span>
              <strong>{portfolio.totalValueUsd != null ? `$${portfolio.totalValueUsd.toFixed(2)}` : '—'}</strong>
            </div>
            <div>
              <span>P&amp;L</span>
              <strong className={pnlClass}>
                {pnl != null ? `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}` : '—'}
                {portfolio.totalPnlPercent != null
                  ? ` (${portfolio.totalPnlPercent >= 0 ? '+' : ''}${portfolio.totalPnlPercent.toFixed(1)}%)`
                  : ''}
              </strong>
            </div>
          </div>

          {portfolio.positions.length ? (
            <ul className="agent-wallet-positions">
              {portfolio.positions.map((position) => (
                <li key={position.mint}>
                  <span>{position.symbol}</span>
                  <span>{position.amount}</span>
                  <span>{position.valueUsd != null ? `$${position.valueUsd.toFixed(2)}` : '—'}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="form-message">This wallet is empty.</p>
          )}
        </>
      ) : null}

      <button
        type="button"
        className="withdraw-button"
        onClick={withdrawFunds}
        disabled={!wallet.connected || withdrawing}
      >
        {withdrawing ? 'Withdrawing…' : 'Withdraw funds →'}
      </button>
      <p className="fund-alt">
        {wallet.connected
          ? 'Sends everything in this wallet to your connected wallet, minus a small SOL reserve for network fees.'
          : 'Connect a wallet above to withdraw with one click.'}
      </p>

      {withdrawResult ? (
        <div className="withdraw-result">
          {withdrawResult.transfers.length === 0 ? (
            <p>Nothing to withdraw.</p>
          ) : (
            <ul>
              {withdrawResult.transfers.map((transfer, index) => (
                <li key={`${transfer.token}-${index}`}>
                  {transfer.ok
                    ? `Sent ${transfer.amount} ${transfer.token}.`
                    : `${transfer.token} failed: ${transfer.error ?? 'unknown error'}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
      {withdrawError ? <p className="form-message form-error" role="alert">{withdrawError}</p> : null}
    </div>
  );
}
