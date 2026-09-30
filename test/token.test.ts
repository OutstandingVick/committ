import assert from 'node:assert/strict';
import test from 'node:test';
import { address, getAddressDecoder, getAddressEncoder } from '@solana/kit';
import { prepareDeployment } from '../src/agent/tools/prepareDeployment';
import { parseRepoUrl } from '../src/agent/tools/parseRepoUrl';
import { isTokenTransactionReview } from '../src/solana/clientTransaction';
import { defaultTokenDescription, defaultTokenImage, draftToken, parseTokenSupply, validateTokenDraft } from '../src/solana/token/draft';
import { parseTokenMetadata } from '../src/solana/token/metadata';
import {
  TOKEN_METADATA_INITIALIZE_DISCRIMINATOR,
  concatBytes,
  getUpdateTokenMetadataFieldInstruction,
  getCreateAccountWithSeedInstruction,
  getInitializeMint2Instruction,
  getRevokeMintAuthorityInstruction,
} from '../src/solana/token/instructions';
import { deriveTokenAddresses, metadataSize, tokenMetadataUri, tokenSeed } from '../src/solana/token/prepareToken';
import { getTemplate } from '../src/templates/registry';

const repo = parseRepoUrl('https://github.com/OutstandingVick/committ');
const creator = address('ATF1EuRfCaWBGBM1jfRy39NuWG8yudNCyak8DV2xRLgp');
const other = address('6NkMViXG4f2FGBMRdjEceN3fQM3fUvTbkbEo17oGRJ6y');

test('drafts a name and symbol from the repository', () => {
  assert.deepEqual(draftToken(parseRepoUrl('https://github.com/a/my-cool_repo')), {
    name: 'My Cool Repo',
    symbol: 'MYCOOLREPO',
    supply: BigInt(1_000_000),
    description: 'Devnet test token for a/my-cool_repo, launched with Committ.',
    image: 'https://github.com/a.png',
  });
});

test('validates token names, symbols, and supply', () => {
  assert.equal(validateTokenDraft({ name: ' Committ ', symbol: 'cmt', supply: BigInt(1), description: '', image: 'https://github.com/a.png' }).symbol, 'CMT');
  assert.throws(() => validateTokenDraft({ name: '', symbol: 'CMT', supply: BigInt(1), description: '', image: 'https://github.com/a.png' }), { code: 'INVALID_TOKEN_NAME' });
  assert.throws(() => validateTokenDraft({ name: 'x'.repeat(33), symbol: 'CMT', supply: BigInt(1), description: '', image: 'https://github.com/a.png' }), { code: 'INVALID_TOKEN_NAME' });
  assert.throws(() => validateTokenDraft({ name: 'Ok', symbol: 'TOO-LONG-SYM', supply: BigInt(1), description: '', image: 'https://github.com/a.png' }), { code: 'INVALID_TOKEN_SYMBOL' });
  assert.throws(() => validateTokenDraft({ name: 'Ok', symbol: 'OK', supply: BigInt(1_000_000_001), description: '', image: 'https://github.com/a.png' }), { code: 'INVALID_TOKEN_SUPPLY' });
  assert.equal(parseTokenSupply('1,000,000'), BigInt(1_000_000));
  assert.throws(() => parseTokenSupply('0'), { code: 'INVALID_TOKEN_SUPPLY' });
  assert.throws(() => parseTokenSupply('1.5'), { code: 'INVALID_TOKEN_SUPPLY' });
});

test('token addresses are deterministic per creator and repository', async () => {
  const seed = await tokenSeed(repo);
  assert.match(seed, /^committ:[0-9a-f]{24}$/);
  assert.equal(new TextEncoder().encode(seed).byteLength, 32);
  const first = await deriveTokenAddresses(creator, repo);
  assert.deepEqual(await deriveTokenAddresses(creator, repo), first);
  assert.notEqual((await deriveTokenAddresses(other, repo)).mint, first.mint);
  assert.notEqual((await deriveTokenAddresses(creator, parseRepoUrl('https://github.com/a/b'))).mint, first.mint);
});

test('only the creator signs; the new mint needs no keypair', () => {
  const ix = getCreateAccountWithSeedInstruction({
    payer: creator, newAccount: other, seed: 'committ:abc', lamports: BigInt(1), space: BigInt(234), owner: other,
  });
  const signers = ix.accounts!.filter((account) => account.role >= 2).map((account) => account.address);
  assert.deepEqual(signers, [creator]);
  assert.throws(() => getCreateAccountWithSeedInstruction({
    payer: creator, newAccount: other, seed: 'x'.repeat(33), lamports: BigInt(1), space: BigInt(1), owner: other,
  }));
});

test('mint has no freeze authority and mint authority is revoked to none', () => {
  const init = getInitializeMint2Instruction({ mint: other, decimals: 9, mintAuthority: creator });
  assert.equal(init.data![0], 20);
  assert.equal(getAddressDecoder().decode(init.data!.slice(2, 34)), creator);
  assert.deepEqual([...init.data!.slice(34)], [0]); // freeze authority: None
  const revoke = getRevokeMintAuthorityInstruction({ mint: other, authority: creator });
  assert.deepEqual([...revoke.data!], [6, 0, 0]); // SetAuthority, MintTokens, None
});

test('metadata discriminator and size match the token metadata interface', () => {
  assert.deepEqual([...TOKEN_METADATA_INITIALIZE_DISCRIMINATOR], [210, 225, 30, 162, 88, 184, 77, 141]);
  assert.equal(metadataSize('A', 'B', 'C'), 4 + 64 + 5 + 5 + 5 + 4);
});

test('the browser rejects token reviews that are not locked-supply devnet launches for this wallet', () => {
  const review = {
    transaction: 'A'.repeat(64),
    message: 'x',
    meta: {
      cluster: 'devnet', simulation: 'passed', operation: 'create-token',
      programId: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', feePayer: creator,
      mintAuthority: 'revoked', freezeAuthority: 'none',
    },
  };
  assert.equal(isTokenTransactionReview(review, creator), true);
  assert.equal(isTokenTransactionReview(review, other), false);
  assert.equal(isTokenTransactionReview({ ...review, meta: { ...review.meta, cluster: 'mainnet' } }, creator), false);
  assert.equal(isTokenTransactionReview({ ...review, meta: { ...review.meta, mintAuthority: 'creator' } }, creator), false);
});

test('the token plan targets Token-2022 on devnet with no custom program', () => {
  assert.equal(getTemplate('devnet-token').auditStatus, 'internal-review');
  const plan = prepareDeployment({
    analysisId: '12345678-abcd', repoUrl: repo.canonicalUrl, template: 'devnet-token', confirmed: true,
    authority: creator, origin: 'https://committ.test',
  });
  assert.equal(plan.template, 'devnet-token');
  assert.equal(plan.cluster, 'devnet');
  assert.equal(plan.programId, 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
  assert.equal(plan.status, 'ready-for-wallet');
  assert.ok(plan.checks.some((check) => /no custom program/.test(check)));
});

test('description and image are validated', () => {
  const base = { name: 'Ok', symbol: 'OK', supply: BigInt(1), description: 'A token.', image: 'https://github.com/a.png' };
  assert.equal(validateTokenDraft({ ...base, description: '  spaced   out  ' }).description, 'spaced out');
  assert.throws(() => validateTokenDraft({ ...base, description: 'x'.repeat(161) }), { code: 'INVALID_TOKEN_DESCRIPTION' });
  for (const image of ['http://example.com/a.png', 'javascript:alert(1)', 'data:image/png;base64,AA', 'https://user:pw@example.com/a.png', 'https://localhost/a.png', `https://example.com/${'i'.repeat(160)}`]) {
    assert.throws(() => validateTokenDraft({ ...base, image }), { code: 'INVALID_TOKEN_IMAGE' }, image);
  }
});

test('defaults use the owner avatar and repository description, bounded', () => {
  assert.equal(defaultTokenImage(repo), 'https://github.com/OutstandingVick.png');
  assert.match(defaultTokenDescription(repo, null), /OutstandingVick\/committ/);
  assert.ok(new TextEncoder().encode(defaultTokenDescription(repo, 'é'.repeat(200))).byteLength <= 160);
});

test('update-field instruction encodes a custom key and value', () => {
  const ix = getUpdateTokenMetadataFieldInstruction({ mint: other, authority: creator, key: 'image', value: 'https://x.y/z' });
  assert.deepEqual([...ix.data!.slice(0, 8)], [221, 233, 49, 45, 181, 202, 220, 200]);
  assert.equal(ix.data![8], 3); // Field::Key
  assert.equal(ix.accounts![1].address, creator);
});

test('parses in-mint metadata written by the token template', () => {
  const encoder = new TextEncoder();
  const str = (value: string) => { const b = encoder.encode(value); const out = new Uint8Array(4 + b.length); new DataView(out.buffer).setUint32(0, b.length, true); out.set(b, 4); return out; };
  const u32 = (n: number) => { const out = new Uint8Array(4); new DataView(out.buffer).setUint32(0, n, true); return out; };
  const encoderAddr = getAddressEncoder();
  const body = concatBytes(
    Uint8Array.from(encoderAddr.encode(creator)), Uint8Array.from(encoderAddr.encode(other)),
    str('Committ'), str('COMMITT'), str('https://committ.test/api/token-metadata?mint=' + other),
    u32(2), str('description'), str('Hello'), str('image'), str('https://github.com/a.png'),
  );
  const pointer = concatBytes(Uint8Array.of(18, 0, 64, 0), new Uint8Array(64));
  const header = new Uint8Array(4); new DataView(header.buffer).setUint16(0, 19, true); new DataView(header.buffer).setUint16(2, body.length, true);
  const data = concatBytes(new Uint8Array(166), pointer, header, body);
  const parsed = parseTokenMetadata(data);
  assert.equal(parsed?.name, 'Committ');
  assert.equal(parsed?.mint, other);
  assert.deepEqual(parsed?.fields, { description: 'Hello', image: 'https://github.com/a.png' });
  assert.equal(parseTokenMetadata(new Uint8Array(166)), null);
  assert.equal(parseTokenMetadata(concatBytes(new Uint8Array(166), header, body.slice(0, 20))), null);
});

test('metadata URI points at the Committ endpoint for the mint', () => {
  assert.equal(tokenMetadataUri('https://committ.test', other), `https://committ.test/api/token-metadata?mint=${other}`);
  assert.ok(metadataSize('A', 'B', 'C', [['image', 'x']]) > metadataSize('A', 'B', 'C'));
});
