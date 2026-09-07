import assert from 'node:assert/strict';
import test from 'node:test';
import {
  address,
  blockhash,
  getAddressEncoder,
  getBase64Encoder,
  getTransactionDecoder,
} from '@solana/kit';

import { CAMPAIGN_ACCOUNT_SIZE, CAMPAIGN_DISCRIMINATOR, decodeCampaignAccount } from '../src/solana/accounts';
import { createTipJarActionDescriptor } from '../src/solana/actionDescriptor';
import { parseSolAmount, parseTipJarActionRequest } from '../src/solana/actionRequest';
import { deriveCampaignAddress, hashRepository } from '../src/solana/campaign';
import { DEFAULT_TIP_JAR_PROGRAM_ADDRESS } from '../src/solana/config';
import { getInitializeCampaignInstruction, getTipInstruction, INITIALIZE_DISCRIMINATOR, TIP_DISCRIMINATOR } from '../src/solana/instructions';
import { prepareTipJarAction } from '../src/solana/prepareAction';
import { buildUnsignedTransaction } from '../src/solana/transaction';
import type { DevnetRpc } from '../src/solana/rpc';

const authority = address('8CjMso3AbebScPgse9HD2cYQj3gcT7xD8UakSgQQNBiE');
const tipper = address('CsDyZiuPAFvWsKoc9Dccn5bB85DRLq6FCXJTwfaZ1UsJ');
const canonicalUrl = 'https://github.com/OutstandingVick/committ';

test('converts bounded decimal SOL amounts to exact lamports', () => {
  assert.equal(parseSolAmount('0.001'), BigInt(1_000_000));
  assert.equal(parseSolAmount('1.000000001'), BigInt(1_000_000_001));
  assert.equal(parseSolAmount('10'), BigInt(10_000_000_000));
  assert.throws(() => parseSolAmount('0.000000001'), /between 0.001 and 10/);
  assert.throws(() => parseSolAmount('1e2'), /decimal places/);
  assert.throws(() => parseSolAmount('10.1'), /between 0.001 and 10/);
});

test('requires campaign authority for tips and binds initialization to the signer', () => {
  const tipUrl = new URL(`https://committ.test/api/actions/tip-jar?repo=${encodeURIComponent(canonicalUrl)}&operation=tip&amount=0.01`);
  assert.throws(() => parseTipJarActionRequest(tipUrl, { account: tipper }), /authority is required/i);

  const initializeUrl = new URL(tipUrl);
  initializeUrl.searchParams.set('operation', 'initialize');
  initializeUrl.searchParams.set('authority', authority);
  assert.throws(() => parseTipJarActionRequest(initializeUrl, { account: tipper }), /signed by its authority/i);
});

test('hashes the canonical repository and derives a stable campaign PDA', async () => {
  const repoHash = await hashRepository(canonicalUrl);
  const [first, firstBump] = await deriveCampaignAddress({ authority, programAddress: DEFAULT_TIP_JAR_PROGRAM_ADDRESS, repoHash });
  const [second, secondBump] = await deriveCampaignAddress({ authority, programAddress: DEFAULT_TIP_JAR_PROGRAM_ADDRESS, repoHash });
  assert.equal(repoHash.byteLength, 32);
  assert.equal(first, second);
  assert.equal(firstBump, secondBump);
});

test('encodes initialize and tip instructions using deployed IDL discriminators', async () => {
  const repoHash = await hashRepository(canonicalUrl);
  const [campaign] = await deriveCampaignAddress({ authority, programAddress: DEFAULT_TIP_JAR_PROGRAM_ADDRESS, repoHash });
  const initialize = getInitializeCampaignInstruction({ authority, campaign, programAddress: DEFAULT_TIP_JAR_PROGRAM_ADDRESS, repoHash });
  const tip = getTipInstruction({ amountLamports: BigInt(12_345_678), campaign, programAddress: DEFAULT_TIP_JAR_PROGRAM_ADDRESS, tipper });
  assert.deepEqual(Array.from(initialize.data!.slice(0, 8)), Array.from(INITIALIZE_DISCRIMINATOR));
  assert.deepEqual(Array.from(tip.data!.slice(0, 8)), Array.from(TIP_DISCRIMINATOR));
  assert.equal(initialize.accounts?.filter((accountMeta) => accountMeta.role >= 2).length, 1);
  assert.equal(tip.accounts?.filter((accountMeta) => accountMeta.role >= 2).length, 1);
});

test('rejects campaign data without the Anchor discriminator', () => {
  assert.throws(() => decodeCampaignAccount(new Uint8Array(CAMPAIGN_ACCOUNT_SIZE)), /not a Committ campaign/);
});

test('decodes a valid campaign account without trusting RPC JSON', async () => {
  const repoHash = await hashRepository(canonicalUrl);
  const data = new Uint8Array(CAMPAIGN_ACCOUNT_SIZE);
  data.set(CAMPAIGN_DISCRIMINATOR, 0);
  data.set(getAddressEncoder().encode(authority), 8);
  data.set(repoHash, 40);
  data[88] = 254;
  const decoded = decodeCampaignAccount(data);
  assert.equal(decoded.authority, authority);
  assert.deepEqual(decoded.repoHash, repoHash);
  assert.equal(decoded.bump, 254);
});

test('advertises create separately from authority-bound tip actions', () => {
  const repo = { owner: 'OutstandingVick', name: 'committ', canonicalUrl };
  const createOnly = createTipJarActionDescriptor({ authority: null, origin: 'https://committ.test', programConfigured: true, repo });
  const shareable = createTipJarActionDescriptor({ authority, origin: 'https://committ.test', programConfigured: true, repo });
  assert.equal(createOnly.links.actions.length, 1);
  assert.equal(shareable.links.actions.length, 3);
  assert.ok(String(shareable.links.actions[1].href).includes(`authority=${authority}`));
});

test('compiles a wallet-signable versioned transaction with no server signature', async () => {
  const repoHash = await hashRepository(canonicalUrl);
  const [campaign] = await deriveCampaignAddress({ authority, programAddress: DEFAULT_TIP_JAR_PROGRAM_ADDRESS, repoHash });
  const instruction = getTipInstruction({ amountLamports: BigInt(10_000_000), campaign, programAddress: DEFAULT_TIP_JAR_PROGRAM_ADDRESS, tipper });
  const rpc = {
    getLatestBlockhash: () => ({ send: async () => ({ value: { blockhash: blockhash('11111111111111111111111111111111'), lastValidBlockHeight: BigInt(99) } }) }),
  } as unknown as DevnetRpc;
  const built = await buildUnsignedTransaction({ feePayer: tipper, instruction, rpc });
  const decoded = getTransactionDecoder().decode(getBase64Encoder().encode(built.wireBase64));
  assert.equal(Object.keys(decoded.signatures).length, 1);
  assert.equal(Object.values(decoded.signatures)[0], null);
  assert.equal(built.lastValidBlockHeight, BigInt(99));
});

test('prepares only a simulated initialization for wallet review', async () => {
  const rpc = {
    getAccountInfo: () => ({ send: async () => ({ value: null }) }),
    getMinimumBalanceForRentExemption: () => ({ send: async () => BigInt(1_102_360) }),
    getLatestBlockhash: () => ({ send: async () => ({ value: { blockhash: blockhash('11111111111111111111111111111111'), lastValidBlockHeight: BigInt(123) } }) }),
    getFeeForMessage: () => ({ send: async () => ({ value: BigInt(5_000) }) }),
    simulateTransaction: () => ({ send: async () => ({ value: { err: null, logs: ['Program log: ok'], unitsConsumed: BigInt(7_193) } }) }),
  } as unknown as DevnetRpc;
  const url = new URL(`https://committ.test/api/actions/tip-jar?repo=${encodeURIComponent(canonicalUrl)}&operation=initialize`);
  const request = parseTipJarActionRequest(url, { account: authority });
  const prepared = await prepareTipJarAction(request, { rpc });
  assert.equal(prepared.meta.simulation, 'passed');
  assert.equal(prepared.meta.cluster, 'devnet');
  assert.equal(prepared.meta.feePayer, authority);
  assert.equal(prepared.meta.estimatedFeeLamports, '5000');
  assert.ok(prepared.transaction.length > 40);
});
