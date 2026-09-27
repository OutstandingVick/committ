import assert from 'node:assert/strict';
import test from 'node:test';
import { walletConnectionMessage } from '../src/solana/walletError';

test('wallet rejection provides a retry path without exposing extension internals', () => {
  assert.match(walletConnectionMessage(new Error('User rejected the request')), /Approve the request/);
});

test('wallet errors provide actionable guidance', () => {
  assert.match(walletConnectionMessage(new Error('Wallet locked')), /Unlock your wallet/);
  assert.match(walletConnectionMessage(new Error('Unexpected error')), /check for a pending request/);
});

test('wallet error messages never echo raw extension text', () => {
  const raw = 'User rejected: chrome-extension://abc123/secret-internal-path';
  const message = walletConnectionMessage(new Error(raw));
  assert.doesNotMatch(message, /chrome-extension|abc123|secret-internal-path/);
  assert.doesNotMatch(walletConnectionMessage(new Error('boom at /internal/stack.js:42')), /internal|stack/);
});

test('pending wallet requests point the user to the open popup', () => {
  assert.match(walletConnectionMessage(new Error('Request already pending')), /already open/);
});

test('non-Error rejections are handled safely', () => {
  assert.match(walletConnectionMessage('User cancelled'), /Approve the request/);
  assert.match(walletConnectionMessage(undefined), /check for a pending request/);
  assert.match(walletConnectionMessage({ code: 4001 }), /check for a pending request/);
});
