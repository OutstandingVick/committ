import assert from 'node:assert/strict';
import test from 'node:test';
import { getTransactionConfirmation } from '../src/solana/confirmation';
import type { DevnetRpc } from '../src/solana/rpc';

const SIGNATURE = '51Wc4r3FXzywAb35FBcNGnrKcRMpNGv3vFJFwB2gNGdmzXMrzT88f44pgEUjBpNNzhuPH1CDpeAuQAackD3ABTGX';

function fakeRpc(status: string | null, getTransaction: () => Promise<unknown>) {
  return {
    getSignatureStatuses: () => ({
      send: async () => ({ value: [status ? { confirmationStatus: status, err: null } : null] }),
    }),
    getTransaction: () => ({ send: getTransaction }),
  } as unknown as DevnetRpc;
}

test('confirmation reports the fee actually paid, including wallet-added priority fees', async () => {
  const rpc = fakeRpc('confirmed', async () => ({ meta: { fee: BigInt(80_000) } }));
  const result = await getTransactionConfirmation(SIGNATURE, { rpc });
  assert.equal(result.confirmed, true);
  assert.equal(result.feeLamports, '80000');
});

test('confirmation does not look up a fee before the transaction confirms', async () => {
  let looked = false;
  const rpc = fakeRpc('processed', async () => { looked = true; return null; });
  const result = await getTransactionConfirmation(SIGNATURE, { rpc });
  assert.equal(result.feeLamports, null);
  assert.equal(looked, false);
});

test('a failed fee lookup does not fail confirmation', async () => {
  const rpc = fakeRpc('finalized', async () => { throw new Error('HTTP error (429)'); });
  const result = await getTransactionConfirmation(SIGNATURE, { rpc });
  assert.equal(result.confirmed, true);
  assert.equal(result.feeLamports, null);
});
