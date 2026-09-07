import type { Address } from '@solana/kit';
import { CommittError } from '../agent/errors';
import { parseRepoUrl } from '../agent/tools/parseRepoUrl';
import type { RepoReference } from '../domain/committ';
import { parseSolanaAddress } from './config';

export type TipJarOperation = 'initialize' | 'tip';

export interface TipJarActionRequest {
  account: Address;
  amountLamports: bigint | null;
  authority: Address;
  operation: TipJarOperation;
  repo: RepoReference;
}

export function parseTipJarActionRequest(
  requestUrl: URL,
  body: unknown,
): TipJarActionRequest {
  const operation = parseOperation(requestUrl.searchParams.get('operation'));
  const account = parseBodyAccount(body);
  const repo = parseRepoUrl(requestUrl.searchParams.get('repo') ?? '');
  const suppliedAuthority = requestUrl.searchParams.get('authority');
  const authority = suppliedAuthority
    ? safeAddress(suppliedAuthority, 'campaign authority')
    : account;

  if (operation === 'initialize' && authority !== account) {
    throw new CommittError(
      'AUTHORITY_MISMATCH',
      'Campaign initialization must be signed by its authority wallet.',
    );
  }
  if (operation === 'tip' && !suppliedAuthority) {
    throw new CommittError('AUTHORITY_REQUIRED', 'A campaign authority is required to build a tip.');
  }

  return {
    account,
    amountLamports: operation === 'tip' ? parseSolAmount(requestUrl.searchParams.get('amount')) : null,
    authority,
    operation,
    repo,
  };
}

export function parseSolAmount(value: string | null): bigint {
  const normalized = value?.trim() ?? '';
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,9})?$/.test(normalized)) {
    throw new CommittError('INVALID_AMOUNT', 'Enter a SOL amount with at most 9 decimal places.');
  }
  const [whole, fraction = ''] = normalized.split('.');
  const lamports = BigInt(whole) * BigInt(1_000_000_000) + BigInt(fraction.padEnd(9, '0'));
  if (lamports < BigInt(1_000_000) || lamports > BigInt(10_000_000_000)) {
    throw new CommittError('INVALID_AMOUNT', 'Tips must be between 0.001 and 10 devnet SOL.');
  }
  return lamports;
}

function parseOperation(value: string | null): TipJarOperation {
  if (value === 'initialize' || value === 'tip') return value;
  throw new CommittError('INVALID_OPERATION', 'Choose either initialize or tip.');
}

function parseBodyAccount(body: unknown): Address {
  if (!body || typeof body !== 'object' || !('account' in body) || typeof body.account !== 'string') {
    throw new CommittError('ACCOUNT_REQUIRED', 'Connect a Solana wallet to continue.');
  }
  return safeAddress(body.account, 'wallet');
}

function safeAddress(value: string, label: string): Address {
  try {
    return parseSolanaAddress(value, label);
  } catch (cause) {
    throw new CommittError(
      'INVALID_ACCOUNT',
      cause instanceof Error ? cause.message : `The ${label} address is invalid.`,
    );
  }
}
