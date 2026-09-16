import assert from 'node:assert/strict';
import test from 'node:test';

import { publicError } from '../src/agent/errors';
import { analyzeRepository } from '../src/agent/chain';
import { classifyProject } from '../src/agent/tools/classifyProject';
import { parseRepoUrl } from '../src/agent/tools/parseRepoUrl';
import { MAX_FILE_BYTES, readRepo } from '../src/agent/tools/readRepo';
import type { RepoSnapshot } from '../src/domain/committ';
import { prepareClawPumpLaunch } from '../src/lib/clawpump';
import { consumeRateLimit } from '../src/lib/rateLimit';

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

test('returns a retryable response when an upstream service is unavailable', () => {
  const error = publicError(new Error('HTTP error (429): rate limited'));
  assert.equal(error.code, 'UPSTREAM_UNAVAILABLE');
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

test('classifies project shape from repository evidence', () => {
  const result = classifyProject(snapshot);
  assert.equal(result.projectKind, 'bot');
  assert.ok(result.confidence >= 0.6);
});

test('runs analysis through one framework-independent chain and drafts a ClawPump token', async () => {
  const result = await analyzeRepository(repo.canonicalUrl, {
    readRepo: async () => snapshot,
    id: () => 'analysis-1234',
    clock: () => 10,
  });
  assert.equal(result.analysisId, 'analysis-1234');
  assert.equal(result.logs.at(-1)?.status, 'waiting');
  assert.equal(result.requiresConfirmation, true);
  assert.equal(result.tokenLaunch.provider, 'ClawPump');
  assert.ok(result.tokenLaunch.ticker.length > 0);
});

test('drafts a ClawPump launch plan directly from the repository, with no bridge configured', () => {
  const plan = prepareClawPumpLaunch(repo);
  assert.equal(plan.status, 'unavailable');
  assert.equal(plan.ticker, 'COMMITT');
  assert.ok(plan.safeguards.some((item) => item.includes('irreversible')));
});

test('limits analysis bursts per client key', () => {
  const key = `test-${Date.now()}`;
  for (let index = 0; index < 8; index += 1) assert.equal(consumeRateLimit(key, 1_000), true);
  assert.equal(consumeRateLimit(key, 1_000), false);
  assert.equal(consumeRateLimit(key, 62_000), true);
});
