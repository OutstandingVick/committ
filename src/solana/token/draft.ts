import { CommittError } from '../../agent/errors';
import type { RepoReference } from '../../domain/committ';

/** Pure token-draft rules, shared by the API and the browser. */

export const TOKEN_DECIMALS = 9;
export const DEFAULT_TOKEN_SUPPLY = BigInt(1_000_000);
const MAX_TOKEN_SUPPLY = BigInt(1_000_000_000);
const MAX_NAME_BYTES = 32;
const MAX_SYMBOL_BYTES = 10;

export interface TokenDraft {
  name: string;
  symbol: string;
  supply: bigint;
}

/** Default name and symbol derived from the repository name. */
export function draftToken(repo: RepoReference): TokenDraft {
  const words = repo.name.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  const name = (words.replace(/\b\w/g, (c) => c.toUpperCase()) || 'Committ Token').slice(0, MAX_NAME_BYTES).trim();
  const symbol = words.replace(/\s+/g, '').toUpperCase().slice(0, MAX_SYMBOL_BYTES) || 'COMMIT';
  return { name, symbol, supply: DEFAULT_TOKEN_SUPPLY };
}

export function validateTokenDraft(draft: TokenDraft): TokenDraft {
  const name = draft.name.trim();
  const symbol = draft.symbol.trim().toUpperCase();
  if (!name || new TextEncoder().encode(name).byteLength > MAX_NAME_BYTES || /[\u0000-\u001f]/.test(name)) {
    throw new CommittError('INVALID_TOKEN_NAME', `Token names must be 1-${MAX_NAME_BYTES} printable characters.`);
  }
  if (!/^[A-Z0-9]{1,10}$/.test(symbol)) {
    throw new CommittError('INVALID_TOKEN_SYMBOL', 'Token symbols must be 1-10 letters or digits.');
  }
  if (draft.supply < BigInt(1) || draft.supply > MAX_TOKEN_SUPPLY) {
    throw new CommittError('INVALID_TOKEN_SUPPLY', 'Supply must be between 1 and 1,000,000,000 whole tokens.');
  }
  return { name, symbol, supply: draft.supply };
}

/** Parse a whole-token supply from user input. */
export function parseTokenSupply(value: string | null): bigint {
  const normalized = (value ?? '').replace(/[,_\s]/g, '');
  if (!/^[1-9]\d{0,9}$/.test(normalized)) {
    throw new CommittError('INVALID_TOKEN_SUPPLY', 'Supply must be a whole number between 1 and 1,000,000,000.');
  }
  return BigInt(normalized);
}
