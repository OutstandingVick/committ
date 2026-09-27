import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSmokeArgs, redactRpcUrl } from '../src/lib/smoke';

test('smoke args default the repository and leave the hosted URL unset', () => {
  assert.deepEqual(parseSmokeArgs(['Wallet111']), {
    wallet: 'Wallet111',
    repository: 'https://github.com/OutstandingVick/committ',
    hostedUrl: undefined,
  });
});

test('smoke --url is reduced to an HTTPS origin', () => {
  const args = parseSmokeArgs(['Wallet111', '--url', 'https://committ.example.site/some/path?x=1']);
  assert.equal(args.hostedUrl, 'https://committ.example.site');
  assert.throws(() => parseSmokeArgs(['Wallet111', '--url', 'http://committ.example.site']), /HTTPS/);
});
