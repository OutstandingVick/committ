import { CommittError } from '../agent/errors';
import type { GithubSession } from '../domain/committ';

/**
 * Encrypts the GitHub session (including the access token) into an opaque
 * cookie value using AES-GCM, so the token never sits in the browser as
 * plain text. Uses only Web Crypto, already available in the Workers
 * runtime, so this adds no new dependency.
 */

export type StoredSession = GithubSession & { accessToken: string };

async function deriveKey(): Promise<CryptoKey> {
  const secret = process.env.COMMITT_SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new CommittError(
      'SESSION_NOT_CONFIGURED',
      'GitHub sign-in is not configured on this deployment yet.',
      503,
    );
  }
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptSession(payload: StoredSession): Promise<string> {
  const key = await deriveKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext));
  return `${toBase64Url(iv)}.${toBase64Url(ciphertext)}`;
}

/** Returns null for anything missing, malformed, or that fails to decrypt - never throws on bad input. */
export async function decryptSession(token: string): Promise<StoredSession | null> {
  try {
    const [ivPart, dataPart] = token.split('.');
    if (!ivPart || !dataPart) return null;
    const key = await deriveKey();
    const iv = fromBase64Url(ivPart);
    const data = fromBase64Url(dataPart);
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return JSON.parse(new TextDecoder().decode(plaintext)) as StoredSession;
  } catch {
    return null;
  }
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
