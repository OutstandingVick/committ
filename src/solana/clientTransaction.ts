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
  review: { transaction: string },
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
): Promise<{ explorerUrl: string; confirmationStatus: string; feeLamports: string | null }> {
  const attempts = options.attempts ?? 24;
  const delayMs = options.delayMs ?? 1_250;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(`/api/transactions/${transactionSignature}`, { cache: 'no-store' });
    const body = await response.json() as {
      confirmed?: boolean;
      confirmationStatus?: string;
      error?: string | { message?: string } | null;
      explorerUrl?: string;
      feeLamports?: string | null;
    };
    if (body.error) {
      const message = typeof body.error === 'string' ? body.error : body.error.message;
      throw new Error(message || 'The transaction failed.');
    }
    if (body.confirmed && body.explorerUrl) {
      return {
        explorerUrl: body.explorerUrl,
        confirmationStatus: body.confirmationStatus ?? 'confirmed',
        feeLamports: typeof body.feeLamports === 'string' && /^\d+$/.test(body.feeLamports) ? body.feeLamports : null,
      };
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

export const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

export interface TokenTransactionReview {
  message: string;
  transaction: string;
  meta: {
    cluster: 'devnet';
    operation: 'create-token';
    programId: string;
    mint: string;
    tokenAccount: string;
    feePayer: string;
    name: string;
    symbol: string;
    uri: string;
    supply: string;
    decimals: number;
    mintAuthority: 'revoked';
    freezeAuthority: 'none';
    computeUnits: string | null;
    estimatedFeeLamports: string;
    estimatedRentLamports: string;
    lastValidBlockHeight: string;
    simulation: 'passed';
  };
}

export async function requestTokenTransaction(input: {
  account: Address;
  repo: string;
  name: string;
  symbol: string;
  supply: string;
}): Promise<TokenTransactionReview> {
  const url = new URL('/api/actions/token', window.location.origin);
  url.searchParams.set('repo', input.repo);
  url.searchParams.set('name', input.name);
  url.searchParams.set('symbol', input.symbol);
  url.searchParams.set('supply', input.supply);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: input.account }),
  });
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(readApiMessage(body));
  if (!isTokenTransactionReview(body, input.account)) throw new Error('Committ returned an invalid token transaction.');
  return body;
}

/** Refuse anything but a simulated devnet Token-2022 launch paid by, and minted to, the connected wallet with supply locked. */
export function isTokenTransactionReview(value: unknown, account: string): value is TokenTransactionReview {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<TokenTransactionReview>;
  return typeof candidate.transaction === 'string'
    && candidate.transaction.length > 40
    && candidate.meta?.cluster === 'devnet'
    && candidate.meta.simulation === 'passed'
    && candidate.meta.operation === 'create-token'
    && candidate.meta.programId === TOKEN_2022_PROGRAM_ID
    && candidate.meta.feePayer === account
    && candidate.meta.mintAuthority === 'revoked'
    && candidate.meta.freezeAuthority === 'none';
}
