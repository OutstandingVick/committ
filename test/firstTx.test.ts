import assert from 'node:assert/strict';
import test from 'node:test';
import { computeFirstTxMetrics, type ChainReader, type SignatureInfo } from '../src/metrics/firstTx';

const PROGRAM = 'Program1';

/** In-memory chain: each tx lists its signers and the addresses it touches. */
function fakeChain(txs: { sig: string; slot: number; signers: string[]; touches: string[]; failed?: boolean }[], firstSlot = 0): ChainReader {
  return {
    async signaturesFor(address, before) {
      const all: SignatureInfo[] = txs
        .filter((tx) => tx.touches.includes(address) || tx.signers.includes(address))
        .sort((a, b) => b.slot - a.slot)
        .map((tx) => ({ signature: tx.sig, slot: BigInt(tx.slot), failed: tx.failed ?? false }));
      const start = before ? all.findIndex((s) => s.signature === before) + 1 : 0;
      return all.slice(start, start + 2); // small pages exercise pagination
    },
    async signers(sig) {
      return txs.find((tx) => tx.sig === sig)?.signers ?? null;
    },
    async firstAvailableSlot() {
      return BigInt(firstSlot);
    },
  };
}

test('counts a wallet whose first signed transaction was Committ, ignoring an earlier airdrop', async () => {
  const metrics = await computeFirstTxMetrics(fakeChain([
    { sig: 'airdrop', slot: 10, signers: ['Faucet'], touches: ['NewWallet'] },
    { sig: 'init', slot: 20, signers: ['NewWallet'], touches: [PROGRAM] },
    { sig: 'tip', slot: 30, signers: ['NewWallet'], touches: [PROGRAM] },
  ]), PROGRAM);
  assert.deepEqual(metrics, { programTransactions: 2, totalWallets: 1, firstTxWallets: 1, undeterminedWallets: 0 });
});

test('does not count a wallet that signed something before Committ', async () => {
  const metrics = await computeFirstTxMetrics(fakeChain([
    { sig: 'transfer', slot: 5, signers: ['OldWallet'], touches: ['Someone'] },
    { sig: 'init', slot: 20, signers: ['OldWallet'], touches: [PROGRAM] },
  ]), PROGRAM);
  assert.equal(metrics.firstTxWallets, 0);
  assert.equal(metrics.totalWallets, 1);
});

test('ignores failed Committ transactions and counts each wallet once', async () => {
  const metrics = await computeFirstTxMetrics(fakeChain([
    { sig: 'bad', slot: 15, signers: ['W1'], touches: [PROGRAM], failed: true },
    { sig: 'a', slot: 20, signers: ['W1'], touches: [PROGRAM] },
    { sig: 'b', slot: 21, signers: ['W1'], touches: [PROGRAM] },
    { sig: 'c', slot: 22, signers: ['W2'], touches: [PROGRAM] },
  ]), PROGRAM);
  assert.equal(metrics.programTransactions, 3);
  assert.equal(metrics.totalWallets, 2);
  assert.equal(metrics.firstTxWallets, 1); // W1's first signed tx was the failed one
});

test('reports wallets as undetermined when history is truncated', async () => {
  const chain = [{ sig: 'init', slot: 20, signers: ['W'], touches: [PROGRAM] }];
  const pruned = await computeFirstTxMetrics(fakeChain(chain, 20), PROGRAM);
  assert.equal(pruned.undeterminedWallets, 1);
  assert.equal(pruned.firstTxWallets, 0);

  const capped = await computeFirstTxMetrics(fakeChain([
    { sig: 'x1', slot: 1, signers: ['W'], touches: [] },
    { sig: 'x2', slot: 2, signers: ['W'], touches: [] },
    { sig: 'x3', slot: 3, signers: ['W'], touches: [] },
    ...chain,
  ]), PROGRAM, { maxPages: 1 });
  assert.equal(capped.undeterminedWallets, 1);
});

test('metrics contain only aggregate numbers', async () => {
  const metrics = await computeFirstTxMetrics(fakeChain([
    { sig: 'init', slot: 20, signers: ['SecretWallet'], touches: [PROGRAM] },
  ]), PROGRAM);
  assert.ok(Object.values(metrics).every((value) => typeof value === 'number'));
  assert.doesNotMatch(JSON.stringify(metrics), /SecretWallet|init/);
});
