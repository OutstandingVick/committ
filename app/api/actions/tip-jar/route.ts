import { publicError } from '../../../../src/agent/errors';
import { parseRepoUrl } from '../../../../src/agent/tools/parseRepoUrl';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const requestUrl = new URL(request.url);
    const repo = parseRepoUrl(requestUrl.searchParams.get('repo') ?? '');
    const origin = requestUrl.origin;
    return actionJson({
      type: 'action',
      icon: `${origin}/favicon.svg`,
      title: `Tip ${repo.owner}/${repo.name}`,
      description: 'Send a voluntary SOL tip through the audited Committ tip-jar program on devnet.',
      label: 'Tip on devnet',
      disabled: !process.env.COMMITT_TIP_JAR_PROGRAM_ID,
      error: process.env.COMMITT_TIP_JAR_PROGRAM_ID
        ? undefined
        : { message: 'The devnet template has not been deployed yet.' },
      links: {
        actions: [
          {
            type: 'transaction',
            label: 'Tip 0.01 SOL',
            href: `${origin}/api/actions/tip-jar?repo=${encodeURIComponent(repo.canonicalUrl)}&amount=0.01`,
          },
          {
            type: 'transaction',
            label: 'Tip custom amount',
            href: `${origin}/api/actions/tip-jar?repo=${encodeURIComponent(repo.canonicalUrl)}&amount={amount}`,
            parameters: [{ name: 'amount', label: 'SOL amount', required: true, type: 'number', min: 0.001 }],
          },
        ],
      },
    });
  } catch (error) {
    const safe = publicError(error);
    return actionJson({ message: safe.message }, safe.status);
  }
}

export async function POST(): Promise<Response> {
  return actionJson(
    {
      message: 'Transaction assembly is locked until the audited template is deployed and configured on devnet.',
    },
    503,
  );
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
  };
}
