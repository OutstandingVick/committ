import { POST } from '../app/api/actions/tip-jar/route';
import { describeNonJsonResponse, parseSmokeArgs, redactRpcUrl } from '../src/lib/smoke';
import { getDevnetRpcUrl } from '../src/solana/config';

const { wallet, repository, hostedUrl } = parseSmokeArgs(process.argv.slice(2));

if (!wallet) {
  console.error('Usage: npm run smoke:blink -- <DEVNET_WALLET_ADDRESS> [GITHUB_REPOSITORY_URL] [--url <HOSTED_ORIGIN>]');
  process.exitCode = 1;
} else {
  const actionUrl = new URL('/api/actions/tip-jar', hostedUrl ?? 'http://localhost');
  actionUrl.searchParams.set('repo', repository);
  actionUrl.searchParams.set('authority', wallet);
  actionUrl.searchParams.set('operation', 'initialize');

  const request = new Request(actionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: wallet }),
  });
  console.log(hostedUrl
    ? `Target: ${hostedUrl} (hosted; RPC is whatever that deployment is configured with)`
    : `Target: in-process route, RPC ${redactRpcUrl(getDevnetRpcUrl())}`);
  const started = performance.now();
  const response = hostedUrl ? await fetch(request) : await POST(request);
  console.log(`HTTP ${response.status} in ${Math.round(performance.now() - started)} ms`);
  const body = await response.text();
  const nonJson = describeNonJsonResponse(response.status, response.headers.get('content-type'), body);
  if (nonJson) {
    console.error(nonJson);
    process.exit(1);
  }
  const result = JSON.parse(body) as {
    code?: string;
    message: string;
    transaction?: string;
    meta?: Record<string, unknown>;
  };

  if (!response.ok || !result.transaction || !result.meta) {
    console.error(`${result.code ?? response.status}: ${result.message}`);
    process.exitCode = 1;
  } else {
    console.log(JSON.stringify({
      message: result.message,
      transactionBytes: Buffer.from(result.transaction, 'base64').byteLength,
      ...result.meta,
    }, null, 2));
    console.log('Simulation passed. The transaction was not signed or sent.');
  }
}
