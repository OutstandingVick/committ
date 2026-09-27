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
