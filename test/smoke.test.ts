import assert from 'node:assert/strict';
import test from 'node:test';
import { describeNonJsonResponse, parseSmokeArgs, redactRpcUrl } from '../src/lib/smoke';

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

test('redacted RPC URLs never include the API key', () => {
  const shown = redactRpcUrl('https://devnet.helius-rpc.com/?api-key=SECRET123');
  assert.equal(shown, 'https://devnet.helius-rpc.com/…');
  assert.doesNotMatch(shown, /SECRET123/);
  assert.equal(redactRpcUrl('https://api.devnet.solana.com'), 'https://api.devnet.solana.com');
  assert.equal(redactRpcUrl('nope'), '(invalid URL)');
});

test('non-JSON smoke responses are explained instead of crashing', () => {
  assert.equal(describeNonJsonResponse(200, 'application/json; charset=utf-8', '{}'), null);
  assert.match(
    describeNonJsonResponse(401, 'text/html', '<body class="login-required">Log in to access</body>') ?? '',
    /requires sign-in/,
  );
  assert.match(describeNonJsonResponse(502, 'text/html', '<h1>Bad gateway</h1>') ?? '', /Expected JSON.*HTTP 502/);
});
