import { POST } from '../app/api/actions/tip-jar/route';

const wallet = process.argv[2]?.trim();
const repository = process.argv[3]?.trim() || 'https://github.com/OutstandingVick/committ';

if (!wallet) {
  console.error('Usage: npm run smoke:blink -- <DEVNET_WALLET_ADDRESS> [GITHUB_REPOSITORY_URL]');
  process.exitCode = 1;
} else {
  const actionUrl = new URL('http://localhost/api/actions/tip-jar');
  actionUrl.searchParams.set('repo', repository);
  actionUrl.searchParams.set('authority', wallet);
  actionUrl.searchParams.set('operation', 'initialize');

  const response = await POST(new Request(actionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: wallet }),
  }));
  const result = await response.json() as {
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
