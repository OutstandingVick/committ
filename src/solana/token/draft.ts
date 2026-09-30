import { CommittError } from '../../agent/errors';
import type { RepoReference } from '../../domain/committ';

/** Pure token-draft rules, shared by the API and the browser. */

export const TOKEN_DECIMALS = 9;
export const DEFAULT_TOKEN_SUPPLY = BigInt(1_000_000);
const MAX_TOKEN_SUPPLY = BigInt(1_000_000_000);
const MAX_NAME_BYTES = 32;
const MAX_SYMBOL_BYTES = 10;
export const MAX_DESCRIPTION_BYTES = 160;
export const MAX_IMAGE_URL_BYTES = 160;

export interface TokenDraft {
  name: string;
  symbol: string;
  supply: bigint;
  description: string;
  image: string;
}

/** Default image: the repository owner's public GitHub avatar. */
export function defaultTokenImage(repo: RepoReference): string {
  return `https://github.com/${repo.owner}.png`;
}

export function defaultTokenDescription(repo: RepoReference, repoDescription?: string | null): string {
  const fallback = `Devnet test token for ${repo.owner}/${repo.name}, launched with Committ.`;
  const text = (repoDescription ?? '').replace(/\s+/g, ' ').trim();
  return truncateBytes(text || fallback, MAX_DESCRIPTION_BYTES);
}

/** Default name, symbol, description, and image derived from the repository. */
export function draftToken(repo: RepoReference, repoDescription?: string | null): TokenDraft {
  const words = repo.name.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  const name = (words.replace(/\b\w/g, (c) => c.toUpperCase()) || 'Committ Token').slice(0, MAX_NAME_BYTES).trim();
  const symbol = words.replace(/\s+/g, '').toUpperCase().slice(0, MAX_SYMBOL_BYTES) || 'COMMIT';
  return {
    name,
    symbol,
    supply: DEFAULT_TOKEN_SUPPLY,
    description: defaultTokenDescription(repo, repoDescription),
    image: defaultTokenImage(repo),
  };
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
  const description = draft.description.replace(/\s+/g, ' ').trim();
  if (new TextEncoder().encode(description).byteLength > MAX_DESCRIPTION_BYTES || /[\u0000-\u001f]/.test(description)) {
    throw new CommittError('INVALID_TOKEN_DESCRIPTION', `Descriptions are limited to ${MAX_DESCRIPTION_BYTES} characters.`);
  }
  return { name, symbol, supply: draft.supply, description, image: validateTokenImage(draft.image) };
}

/** Images must be plain HTTPS URLs; wallets fetch them directly. */
export function validateTokenImage(value: string): string {
  const trimmed = value.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new CommittError('INVALID_TOKEN_IMAGE', 'The image must be an https:// URL.');
  }
  if (url.protocol !== 'https:' || !url.hostname.includes('.') || url.username || url.password
    || new TextEncoder().encode(url.toString()).byteLength > MAX_IMAGE_URL_BYTES) {
    throw new CommittError('INVALID_TOKEN_IMAGE', `The image must be an https:// URL of at most ${MAX_IMAGE_URL_BYTES} characters.`);
  }
  return url.toString();
}

function truncateBytes(value: string, maxBytes: number): string {
  let output = value;
  while (new TextEncoder().encode(output).byteLength > maxBytes) output = output.slice(0, -2) + '…';
  return output;
}

/** Parse a whole-token supply from user input. */
export function parseTokenSupply(value: string | null): bigint {
  const normalized = (value ?? '').replace(/[,_\s]/g, '');
  if (!/^[1-9]\d{0,9}$/.test(normalized)) {
    throw new CommittError('INVALID_TOKEN_SUPPLY', 'Supply must be a whole number between 1 and 1,000,000,000.');
  }
  return BigInt(normalized);
}
