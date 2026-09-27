import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { DEVNET_RPC_URL, getDevnetRpcUrl } from '../src/solana/config';

const original = process.env.COMMITT_SOLANA_RPC_URL;
afterEach(() => {
  if (original === undefined) delete process.env.COMMITT_SOLANA_RPC_URL;
  else process.env.COMMITT_SOLANA_RPC_URL = original;
});

test('falls back to the public devnet endpoint when unset', () => {
  delete process.env.COMMITT_SOLANA_RPC_URL;
  assert.equal(getDevnetRpcUrl(), DEVNET_RPC_URL);
});

test('invalid or non-HTTPS RPC URLs raise a typed error without echoing the value', () => {
  process.env.COMMITT_SOLANA_RPC_URL = 'not a url SECRET';
  assert.throws(() => getDevnetRpcUrl(), (e: Error & { code?: string }) =>
    e.code === 'DEVNET_RPC_MISCONFIGURED' && !e.message.includes('SECRET'));
  process.env.COMMITT_SOLANA_RPC_URL = 'http://devnet.example.com';
  assert.throws(() => getDevnetRpcUrl(), { code: 'DEVNET_RPC_MISCONFIGURED' });
});
