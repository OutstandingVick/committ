import { CommittError, publicError } from '../../../../src/agent/errors';
import { getAgentPortfolio } from '../../../../src/lib/clawpump';

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json() as { agentId?: string };
    if (!body.agentId) {
      throw new CommittError('INVALID_INPUT', 'agentId is required.');
    }
    const portfolio = await getAgentPortfolio(body.agentId);
    return Response.json(portfolio, { status: 200 });
  } catch (error) {
    const safe = publicError(error);
    return Response.json({ error: { code: safe.code, message: safe.message } }, { status: safe.status });
  }
}
