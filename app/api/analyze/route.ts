import { analyzeRepository } from '../../../src/agent/chain';
import { CommittError, publicError } from '../../../src/agent/errors';
import { consumeRateLimit } from '../../../src/lib/rateLimit';

export async function POST(request: Request): Promise<Response> {
  const clientKey = request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'local';

  if (!consumeRateLimit(clientKey)) {
    return jsonError(new CommittError('RATE_LIMITED', 'Too many analyses. Please retry in a minute.', 429));
  }

  try {
    if (Number(request.headers.get('content-length') ?? 0) > 2_048) {
      throw new CommittError('REQUEST_TOO_LARGE', 'The analysis request is too large.', 413);
    }
    const body = await request.json() as { repoUrl?: unknown };
    if (typeof body.repoUrl !== 'string') {
      throw new CommittError('INVALID_REQUEST', 'A GitHub repository URL is required.');
    }
    const result = await analyzeRepository(body.repoUrl);
    return Response.json(result, { status: 200 });
  } catch (error) {
    return jsonError(publicError(error));
  }
}

function jsonError(error: CommittError): Response {
  return Response.json(
    { error: { code: error.code, message: error.message } },
    { status: error.status },
  );
}
