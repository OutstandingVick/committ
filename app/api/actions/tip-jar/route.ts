import { publicError } from '../../../../src/agent/errors';
import { parseRepoUrl } from '../../../../src/agent/tools/parseRepoUrl';
import { createTipJarActionDescriptor } from '../../../../src/solana/actionDescriptor';
import { parseTipJarActionRequest } from '../../../../src/solana/actionRequest';
import { getTipJarProgramAddress, parseSolanaAddress } from '../../../../src/solana/config';
import { prepareTipJarAction } from '../../../../src/solana/prepareAction';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const requestUrl = new URL(request.url);
    const repo = parseRepoUrl(requestUrl.searchParams.get('repo') ?? '');
    const origin = requestUrl.origin;
    const authorityValue = requestUrl.searchParams.get('authority');
    const authority = authorityValue ? parseSolanaAddress(authorityValue, 'campaign authority') : null;
    getTipJarProgramAddress();
    return actionJson(createTipJarActionDescriptor({
      authority,
      origin,
      programConfigured: true,
      repo,
    }));
  } catch (error) {
    const safe = publicError(error);
    return actionJson({ message: safe.message }, safe.status);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const length = Number(request.headers.get('content-length') ?? '0');
    if (length > 2_048) return actionJson({ message: 'The request body is too large.' }, 413);
    const action = parseTipJarActionRequest(new URL(request.url), await request.json());
    return actionJson(await prepareTipJarAction(action));
  } catch (error) {
    const safe = publicError(error);
    return actionJson({ message: safe.message, code: safe.code }, safe.status);
  }
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: actionHeaders() });
}

function actionJson(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: actionHeaders() });
}

function actionHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Content-Encoding, Accept-Encoding',
    'X-Action-Version': '2.4',
    'X-Blockchain-Ids': 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
    'Cache-Control': 'no-store',
  };
}
