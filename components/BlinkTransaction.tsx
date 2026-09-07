'use client';

import { useWalletConnection } from '@solana/react-hooks';
import { useState } from 'react';
import {
  requestBlinkTransaction,
  sendBlinkTransaction,
  waitForTransactionConfirmation,
  type BlinkTransactionReview,
} from '../src/solana/clientTransaction';
import type { TipJarOperation } from '../src/solana/actionRequest';

export function BlinkTransaction({ blinkUrl }: { blinkUrl: string }) {
  const wallet = useWalletConnection();
  const [operation, setOperation] = useState<TipJarOperation>('initialize');
  const [amount, setAmount] = useState('0.01');
  const [review, setReview] = useState<BlinkTransactionReview | null>(null);
  const [approved, setApproved] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'preparing' | 'review' | 'signing' | 'confirming' | 'success'>('idle');
  const [error, setError] = useState('');
  const [signature, setSignature] = useState('');
  const [explorerUrl, setExplorerUrl] = useState('');

  async function prepare() {
    if (!wallet.wallet) {
      setError('Connect the authority or tipper wallet first.');
      return;
    }
    setError('');
    setApproved(false);
    setReview(null);
    setPhase('preparing');
    try {
      const prepared = await requestBlinkTransaction({
        account: wallet.wallet.account.address,
        amount,
        blinkUrl,
        operation,
      });
      setReview(prepared);
      setPhase('review');
    } catch (cause) {
      setPhase('idle');
      setError(toMessage(cause));
    }
  }

  async function signAndSend() {
    if (!wallet.wallet || !review || !approved) return;
    setError('');
    setPhase('signing');
    try {
      const sentSignature = await sendBlinkTransaction(wallet.wallet, review);
      setSignature(sentSignature);
      setExplorerUrl(`https://explorer.solana.com/tx/${sentSignature}?cluster=devnet`);
      setPhase('confirming');
      const confirmation = await waitForTransactionConfirmation(sentSignature);
      setExplorerUrl(confirmation.explorerUrl);
      setPhase('success');
    } catch (cause) {
      setPhase(review ? 'review' : 'idle');
      setError(toMessage(cause));
    }
  }

  function changeOperation(next: TipJarOperation) {
    setOperation(next);
    setReview(null);
    setApproved(false);
    setError('');
    setSignature('');
    setExplorerUrl('');
    setPhase('idle');
  }

  return (
    <section className="blink-transaction" aria-labelledby="blink-title">
      <div className="blink-heading">
        <div>
          <span className="report-kicker">Live devnet path</span>
          <h4 id="blink-title">Create it. Tip it. Prove it.</h4>
        </div>
        <span className="simulation-badge">Simulation required</span>
      </div>

      <div className="operation-tabs" aria-label="Transaction type">
        <button className={operation === 'initialize' ? 'active' : ''} type="button" onClick={() => changeOperation('initialize')}>Create tip jar</button>
        <button className={operation === 'tip' ? 'active' : ''} type="button" onClick={() => changeOperation('tip')}>Send a tip</button>
      </div>

      {operation === 'tip' ? (
        <label className="amount-field">
          <span>Tip amount</span>
          <span><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" /> devnet SOL</span>
        </label>
      ) : null}

      <button className="prepare-transaction" type="button" onClick={() => void prepare()} disabled={!wallet.connected || phase === 'preparing'}>
        {!wallet.connected ? 'Connect wallet above' : phase === 'preparing' ? 'Building + simulating…' : 'Build transaction review →'}
      </button>

      {review ? (
        <div className="transaction-review" aria-live="polite">
          <div className="review-status"><span>Preflight simulation</span><strong>Passed ✓</strong></div>
          <dl>
            <div><dt>Action</dt><dd>{review.meta.operation === 'initialize' ? 'Create campaign PDA' : 'Send SOL tip'}</dd></div>
            <div><dt>Cluster</dt><dd>Solana devnet</dd></div>
            <div><dt>Program</dt><dd>{review.meta.programId}</dd></div>
            <div><dt>Campaign</dt><dd>{review.meta.campaign}</dd></div>
            <div><dt>Fee payer</dt><dd>{review.meta.feePayer}</dd></div>
            <div><dt>Amount</dt><dd>{lamportsToSol(review.meta.amountLamports)} SOL</dd></div>
            <div><dt>Estimated fee</dt><dd>{lamportsToSol(review.meta.estimatedFeeLamports)} SOL</dd></div>
            {review.meta.estimatedRentLamports !== '0' ? <div><dt>Account rent</dt><dd>{lamportsToSol(review.meta.estimatedRentLamports)} SOL</dd></div> : null}
            <div><dt>Compute</dt><dd>{review.meta.computeUnits ?? 'RPC unavailable'} units</dd></div>
          </dl>
          <label className="transaction-approval">
            <input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} />
            <span>I reviewed this devnet transaction and approve my wallet signing it.</span>
          </label>
          <button type="button" className="sign-transaction" disabled={!approved || phase === 'signing' || phase === 'confirming'} onClick={() => void signAndSend()}>
            {phase === 'signing' ? 'Waiting for wallet…' : phase === 'confirming' ? 'Confirming on devnet…' : 'Sign and send →'}
          </button>
        </div>
      ) : null}

      {signature ? (
        <div className={`transaction-proof ${phase === 'success' ? 'confirmed' : ''}`}>
          <span>{phase === 'success' ? 'Confirmed on devnet' : 'Transaction submitted'}</span>
          <code>{signature}</code>
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
  const fractional = (lamports % BigInt(1_000_000_000)).toString().padStart(9, '0').replace(/0+$/, '');
  return fractional ? `${whole}.${fractional}` : whole.toString();
}

function toMessage(cause: unknown): string {
  if (cause instanceof Error) {
    if (/reject|declin|cancel/i.test(cause.message)) return 'The wallet declined the transaction. Nothing was sent.';
    return cause.message;
  }
  return 'The transaction could not be completed.';
}
