import {
  assertIsTransactionWithinSizeLimit,
  getBase64Encoder,
  getTransactionDecoder,
  type Address,
  type Signature,
  type SendableTransaction,
  type Transaction,
} from '@solana/kit';
import type { WalletSession } from '@solana/client';
import type { TipJarOperation } from './actionRequest';

export interface BlinkTransactionReview {
  message: string;
  transaction: string;
  meta: {
    amountLamports: string;
    campaign: string;
    cluster: 'devnet';
    computeUnits: string | null;
    estimatedFeeLamports: string;
    estimatedRentLamports: string;
    feePayer: string;
    lastValidBlockHeight: string;
    operation: TipJarOperation;
    programId: string;
    simulation: 'passed';
  };
}

export async function requestBlinkTransaction(input: {
  account: Address;
  amount?: string;
  blinkUrl: string;
  operation: TipJarOperation;
}): Promise<BlinkTransactionReview> {
  const url = new URL(input.blinkUrl, window.location.origin);
  url.searchParams.set('operation', input.operation);
  if (input.operation === 'tip') url.searchParams.set('amount', input.amount ?? '');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: input.account }),
  });
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(readApiMessage(body));
  if (!isBlinkTransactionReview(body)) throw new Error('Committ returned an invalid transaction response.');
  return body;
}

export async function sendBlinkTransaction(
  session: WalletSession,
  review: BlinkTransactionReview,
): Promise<Signature> {
  if (!session.sendTransaction) throw new Error('This wallet cannot send Solana transactions.');
  const transactionBytes = getBase64Encoder().encode(review.transaction);
  const transaction = getTransactionDecoder().decode(transactionBytes);
  assertIsTransactionWithinSizeLimit(transaction);
  // The framework-kit wallet adapter applies the missing wallet signature before
  // broadcasting. Keep this cast at the Wallet Standard compatibility boundary.
  return session.sendTransaction(transaction as SendableTransaction & Transaction, {
    commitment: 'confirmed',
  });
}

export async function waitForTransactionConfirmation(
  transactionSignature: Signature,
  options: { attempts?: number; delayMs?: number } = {},
): Promise<{ explorerUrl: string; confirmationStatus: string }> {
  const attempts = options.attempts ?? 24;
  const delayMs = options.delayMs ?? 1_250;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(`/api/transactions/${transactionSignature}`, { cache: 'no-store' });
    const body = await response.json() as {
      confirmed?: boolean;
      confirmationStatus?: string;
      error?: string | { message?: string } | null;
      explorerUrl?: string;
    };
    if (body.error) {
      const message = typeof body.error === 'string' ? body.error : body.error.message;
      throw new Error(message || 'The transaction failed.');
    }
    if (body.confirmed && body.explorerUrl) {
      return { explorerUrl: body.explorerUrl, confirmationStatus: body.confirmationStatus ?? 'confirmed' };
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error('Confirmation is taking longer than expected. Check the transaction in Explorer.');
}

function isBlinkTransactionReview(value: unknown): value is BlinkTransactionReview {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<BlinkTransactionReview>;
  return typeof candidate.transaction === 'string'
    && candidate.transaction.length > 40
    && typeof candidate.message === 'string'
    && candidate.meta?.cluster === 'devnet'
    && candidate.meta.simulation === 'passed'
    && typeof candidate.meta.programId === 'string'
    && typeof candidate.meta.feePayer === 'string';
}

function readApiMessage(value: unknown): string {
  if (value && typeof value === 'object' && 'message' in value && typeof value.message === 'string') {
    return value.message;
  }
  return 'Committ could not prepare this transaction.';
}
