import assert from 'node:assert/strict';
import test from 'node:test';

import { publicError } from '../src/agent/errors';
import { analyzeRepository } from '../src/agent/chain';
import { classifyProject } from '../src/agent/tools/classifyProject';
import { parseRepoUrl } from '../src/agent/tools/parseRepoUrl';
import { prepareDeployment } from '../src/agent/tools/prepareDeployment';
import { MAX_FILE_BYTES, readRepo } from '../src/agent/tools/readRepo';
import type { RepoSnapshot } from '../src/domain/committ';
import { prepareClawPumpLaunch } from '../src/lib/clawpump';
import { consumeRateLimit } from '../src/lib/rateLimit';
import { DEFAULT_TIP_JAR_PROGRAM_ADDRESS } from '../src/solana/config';

const repo = parseRepoUrl('https://github.com/OutstandingVick/committ.git');
const snapshot: RepoSnapshot = {
  repo,
  description: 'A Discord bot for open source maintainers',
  defaultBranch: 'main',
  stars: 2,
  primaryLanguage: 'TypeScript',
  topics: ['discord'],
  files: [{ path: 'README.md', content: 'Support this community Discord bot.', byteLength: 35 }],
  fetchedAt: '2026-09-07T00:00:00.000Z',
  truncated: false,
};

test('returns a retryable response when the devnet RPC is unavailable', () => {
  const error = publicError(new Error('HTTP error (429): rate limited'));
  assert.equal(error.code, 'DEVNET_RPC_UNAVAILABLE');
  assert.equal(error.status, 503);
});

test('accepts only canonical public GitHub repository URLs', () => {
  assert.deepEqual(repo, {
    owner: 'OutstandingVick',
    name: 'committ',
    canonicalUrl: 'https://github.com/OutstandingVick/committ',
  });
  assert.throws(() => parseRepoUrl('http://github.com/a/b'), /https:\/\/github\.com/);
  assert.throws(() => parseRepoUrl('https://example.com/a/b'), /github\.com/);
  assert.throws(() => parseRepoUrl('https://github.com/a/b/tree/main'), /repository root/);
});

test('reads only allowlisted files and truncates oversized text', async () => {
  const fakeClient = {
    getRepository: async () => ({ description: null, default_branch: 'main', stargazers_count: 0, language: null }),
    getTextFile: async (_repo: typeof repo, path: string) => path === 'README.md' ? 'x'.repeat(MAX_FILE_BYTES + 50) : null,
  };
  const result = await readRepo(repo, { client: fakeClient, now: () => new Date('2026-09-07T00:00:00.000Z') });
  assert.equal(result.files.length, 1);
  assert.equal(result.files[0].byteLength, MAX_FILE_BYTES);
  assert.equal(result.truncated, true);
});

test('maps bot evidence to the fixed tip jar template', () => {
  const result = classifyProject(snapshot);
  assert.equal(result.projectKind, 'bot');
  assert.equal(result.recommendedTemplate, 'tip-jar');
  assert.ok(result.confidence >= 0.7);
});

test('runs analysis through one framework-independent chain', async () => {
  const result = await analyzeRepository(repo.canonicalUrl, {
    readRepo: async () => snapshot,
    id: () => 'analysis-1234',
    clock: () => 10,
  });
  assert.equal(result.analysisId, 'analysis-1234');
  assert.equal(result.logs.at(-1)?.status, 'waiting');
  assert.equal(result.requiresConfirmation, true);
});

test('requires confirmation and never prepares mainnet', () => {
  assert.throws(() => prepareDeployment({
    analysisId: '12345678', repoUrl: repo.canonicalUrl, template: 'tip-jar', confirmed: false, origin: 'https://committ.test',
  }), /confirm/i);
  const plan = prepareDeployment({
    analysisId: '12345678', repoUrl: repo.canonicalUrl, template: 'tip-jar', confirmed: true, origin: 'https://committ.test',
  });
  assert.equal(plan.cluster, 'devnet');
  assert.equal(plan.status, 'needs-authority');
  assert.match(plan.blinkUrl, /^https:\/\/committ\.test/);
});

test('uses the deployed devnet program when no environment override is set', () => {
  const previous = process.env.COMMITT_TIP_JAR_PROGRAM_ID;
  delete process.env.COMMITT_TIP_JAR_PROGRAM_ID;
  try {
    const plan = prepareDeployment({
      analysisId: '12345678',
      repoUrl: repo.canonicalUrl,
      template: 'tip-jar',
      authority: '8CjMso3AbebScPgse9HD2cYQj3gcT7xD8UakSgQQNBiE',
      confirmed: true,
      origin: 'https://committ.test',
    });
    assert.equal(plan.status, 'ready-for-wallet');
    assert.equal(plan.programId, DEFAULT_TIP_JAR_PROGRAM_ADDRESS);
    assert.match(plan.explorerUrl ?? '', /cluster=devnet/);
    assert.match(plan.blinkUrl, /authority=8CjMso3/);
    assert.ok(plan.checks.includes('The deployed template program is configured.'));
  } finally {
    if (previous === undefined) delete process.env.COMMITT_TIP_JAR_PROGRAM_ID;
    else process.env.COMMITT_TIP_JAR_PROGRAM_ID = previous;
  }
});

test('reports ClawPump launch as unimplemented', () => {
  const plan = prepareClawPumpLaunch(repo);
  assert.equal(plan.status, 'not-implemented');
  assert.equal(plan.ticker, 'COMMITT');
  assert.ok(plan.safeguards.some((item) => item.includes('irreversible')));
});

test('limits analysis bursts per client key', () => {
  const key = `test-${Date.now()}`;
  for (let index = 0; index < 8; index += 1) assert.equal(consumeRateLimit(key, 1_000), true);
  assert.equal(consumeRateLimit(key, 1_000), false);
  assert.equal(consumeRateLimit(key, 62_000), true);
});
