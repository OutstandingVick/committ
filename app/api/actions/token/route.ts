import { CommittError, publicError } from '../../../../src/agent/errors';
import { parseRepoUrl } from '../../../../src/agent/tools/parseRepoUrl';
import { consumeRateLimit } from '../../../../src/lib/rateLimit';
import { parseSolanaAddress } from '../../../../src/solana/config';
import { parseTokenSupply } from '../../../../src/solana/token/draft';
import { prepareTokenLaunch } from '../../../../src/solana/token/prepareToken';

export const dynamic = 'force-dynamic';

/** Builds and simulates an unsigned devnet token-creation transaction. Never signs. */
export async function POST(request: Request): Promise<Response> {
  try {
    const clientKey = request.headers.get('cf-connecting-ip')
      ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? 'anonymous';
    if (!consumeRateLimit(`token:${clientKey}`)) {
      return json({ message: 'Too many transaction requests. Try again in one minute.' }, 429);
    }
    const rawBody = await request.text();
    if (rawBody.length > 2_048) return json({ message: 'The request body is too large.' }, 413);
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new CommittError('INVALID_JSON', 'Send a valid JSON request body.');
    }
    const account = body && typeof body === 'object' && 'account' in body && typeof body.account === 'string'
      ? body.account
      : '';
    const url = new URL(request.url);
    let creator;
    try {
      creator = parseSolanaAddress(account, 'creator wallet');
    } catch {
      throw new CommittError('INVALID_ACCOUNT', 'Connect a valid Solana wallet first.');
    }
    const repo = parseRepoUrl(url.searchParams.get('repo') ?? '');
    const prepared = await prepareTokenLaunch({
      creator,
      repo,
      draft: {
        name: url.searchParams.get('name') ?? '',
        symbol: url.searchParams.get('symbol') ?? '',
        supply: parseTokenSupply(url.searchParams.get('supply')),
      },
    });
    return json(prepared);
  } catch (error) {
    const safe = publicError(error);
    return json({ message: safe.message, code: safe.code }, safe.status);
  }
}

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}
