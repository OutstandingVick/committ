'use client';

import { useWalletConnection } from '@solana/react-hooks';
import { useState } from 'react';
import {
  requestTokenTransaction,
  sendBlinkTransaction,
  waitForTransactionConfirmation,
  type TokenTransactionReview,
} from '../src/solana/clientTransaction';

export function TokenLaunch({ repoUrl, defaultName, defaultSymbol }: { repoUrl: string; defaultName: string; defaultSymbol: string }) {
  const wallet = useWalletConnection();
  const [name, setName] = useState(defaultName);
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [supply, setSupply] = useState('1000000');
  const [review, setReview] = useState<TokenTransactionReview | null>(null);
  const [approved, setApproved] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'preparing' | 'review' | 'signing' | 'confirming' | 'success'>('idle');
  const [error, setError] = useState('');
  const [signature, setSignature] = useState('');
  const [explorerUrl, setExplorerUrl] = useState('');
  const [paidFeeLamports, setPaidFeeLamports] = useState<string | null>(null);

  function reset() {
    setReview(null);
    setApproved(false);
    setError('');
    setPhase('idle');
  }

  async function prepare() {
    if (!wallet.wallet) {
      setError('Connect the wallet that will own the token first.');
      return;
    }
    reset();
    setPhase('preparing');
    try {
      setReview(await requestTokenTransaction({ account: wallet.wallet.account.address, repo: repoUrl, name, symbol, supply }));
      setPhase('review');
    } catch (cause) {
      setPhase('idle');
      setError(cause instanceof Error ? cause.message : 'Committ could not prepare this token.');
    }
  }

  async function signAndSend() {
    if (!wallet.wallet || !review || !approved) return;
    setError('');
    setPaidFeeLamports(null);
    setPhase('signing');
    try {
      const sent = await sendBlinkTransaction(wallet.wallet, review);
      setSignature(sent);
      setExplorerUrl(`https://explorer.solana.com/tx/${sent}?cluster=devnet`);
      setPhase('confirming');
      const confirmation = await waitForTransactionConfirmation(sent);
      setExplorerUrl(confirmation.explorerUrl);
      setPaidFeeLamports(confirmation.feeLamports);
      setPhase('success');
    } catch (cause) {
      setPhase('review');
      const message = cause instanceof Error ? cause.message : '';
      setError(/reject|declin|denied|cancel/i.test(message)
        ? 'The wallet declined the transaction. Nothing was sent.'
        : message || 'The token transaction failed.');
    }
  }

  return (
    <section className="blink-transaction" aria-labelledby="token-title">
      <div className="blink-heading">
        <div>
          <span className="report-kicker">Devnet token</span>
          <h4 id="token-title">Launch a test token for this repo.</h4>
        </div>
        <span className="simulation-badge">Simulation required</span>
      </div>

      <label className="amount-field">
        <span>Name</span>
        <span><input value={name} maxLength={32} onChange={(event) => { setName(event.target.value); reset(); }} /></span>
      </label>
      <label className="amount-field">
        <span>Symbol</span>
        <span><input value={symbol} maxLength={10} onChange={(event) => { setSymbol(event.target.value.toUpperCase()); reset(); }} /></span>
      </label>
      <label className="amount-field">
        <span>Supply</span>
        <span><input value={supply} inputMode="numeric" onChange={(event) => { setSupply(event.target.value); reset(); }} /> tokens</span>
      </label>

      <button className="prepare-transaction" type="button" onClick={() => void prepare()} disabled={!wallet.connected || phase === 'preparing'}>
        {!wallet.connected ? 'Connect wallet above' : phase === 'preparing' ? 'Building + simulating…' : 'Build token review →'}
      </button>

      {review ? (
        <div className="transaction-review" aria-live="polite">
          <div className="review-status"><span>Preflight simulation</span><strong>Passed ✓</strong></div>
          <dl>
            <div><dt>Action</dt><dd>Create devnet token</dd></div>
            <div><dt>Cluster</dt><dd>Solana devnet</dd></div>
            <div><dt>Program</dt><dd>{review.meta.programId} (Token-2022)</dd></div>
            <div><dt>Token</dt><dd>{review.meta.name} · {review.meta.symbol}</dd></div>
            <div><dt>Mint</dt><dd>{review.meta.mint}</dd></div>
            <div><dt>Supply</dt><dd>{Number(review.meta.supply).toLocaleString()} to your wallet</dd></div>
            <div><dt>Mint authority</dt><dd>Revoked: supply can never increase</dd></div>
            <div><dt>Freeze authority</dt><dd>None</dd></div>
            <div><dt>Linked repo</dt><dd>{review.meta.uri}</dd></div>
            <div><dt>Fee payer</dt><dd>{review.meta.feePayer}</dd></div>
            <div><dt>Base network fee</dt><dd>{lamportsToSol(review.meta.estimatedFeeLamports)} SOL</dd></div>
            <div><dt>Account rent</dt><dd>{lamportsToSol(review.meta.estimatedRentLamports)} SOL</dd></div>
            <div><dt>Compute</dt><dd>{review.meta.computeUnits ?? 'RPC unavailable'} units</dd></div>
          </dl>
          <p className="fee-note">This is a devnet test token with no monetary value. It is your own token, not an official token of the repository. Your wallet may add a priority fee when you sign.</p>
          <label className="transaction-approval">
            <input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} />
            <span>I reviewed this devnet token transaction and approve my wallet signing it.</span>
          </label>
          <button type="button" className="sign-transaction" disabled={!approved || phase === 'signing' || phase === 'confirming'} onClick={() => void signAndSend()}>
            {phase === 'signing' ? 'Waiting for wallet…' : phase === 'confirming' ? 'Confirming on devnet…' : 'Sign and send →'}
          </button>
        </div>
      ) : null}

      {signature ? (
        <div className={`transaction-proof ${phase === 'success' ? 'confirmed' : ''}`}>
          <span>{phase === 'success' ? 'Token created on devnet' : 'Transaction submitted'}</span>
          <code>{signature}</code>
          {phase === 'success' && paidFeeLamports ? <span>Fee paid: {lamportsToSol(paidFeeLamports)} SOL</span> : null}
          <a href={explorerUrl} target="_blank" rel="noreferrer">Open transaction in Explorer ↗</a>
        </div>
      ) : null}
      {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
    </section>
  );
}

function lamportsToSol(value: string): string {
  const lamports = BigInt(value);
  const whole = lamports / BigInt(1_000_000_000);
  const fraction = (lamports % BigInt(1_000_000_000)).toString().padStart(9, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : whole.toString();
}
