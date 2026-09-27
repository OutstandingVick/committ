import assert from 'node:assert/strict';
import test from 'node:test';
import { sendDevnetRpcRequest } from '../src/solana/rpc';
import { classifyRpcFailure } from '../src/solana/rpcFailure';

const failing = (message: string) => {
  let calls = 0;
  return { request: { send: async () => { calls += 1; throw new Error(message); } }, calls: () => calls };
};

test('classifies 401 and 403 RPC responses as unauthorized', () => {
  assert.equal(classifyRpcFailure(new Error('HTTP error (401): Unauthorized')), 'unauthorized');
  assert.equal(classifyRpcFailure(new Error('HTTP error (403): Forbidden')), 'unauthorized');
});

test('unauthorized RPC failures are not retried', async () => {
  const { request, calls } = failing('HTTP error (401): Unauthorized');
  await assert.rejects(sendDevnetRpcRequest(request), { code: 'DEVNET_RPC_UNAUTHORIZED', status: 503 });
  assert.equal(calls(), 1);
});

test('classifies DNS and URL failures as misconfigured', () => {
  assert.equal(classifyRpcFailure(new Error('getaddrinfo ENOTFOUND devnet.example')), 'misconfigured');
  assert.equal(classifyRpcFailure(new TypeError('Invalid URL')), 'misconfigured');
});

test('misconfigured RPC failures are not retried', async () => {
  const { request, calls } = failing('getaddrinfo ENOTFOUND devnet.example');
  await assert.rejects(sendDevnetRpcRequest(request), { code: 'DEVNET_RPC_MISCONFIGURED' });
  assert.equal(calls(), 1);
});

test('throttling still classifies as unavailable', () => {
  assert.equal(classifyRpcFailure(new Error('HTTP error (429): Too Many Requests')), 'unavailable');
  assert.equal(classifyRpcFailure(undefined), 'unavailable');
});

test('RPC error messages never echo the endpoint or key', async () => {
  const { request } = failing('HTTP error (401) at https://devnet.helius-rpc.com/?api-key=SECRET123');
  await assert.rejects(sendDevnetRpcRequest(request), (error: Error) => !/SECRET123|helius/.test(error.message));
});
