import { CommittError, publicError } from '../../../../src/agent/errors';
import { getClawPumpBalance } from '../../../../src/lib/clawpump';

/** ClawPump's own service-credit balance - separate from the agent wallet's SOL/token holdings. */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json() as { agentId?: string };
    if (!body.agentId) {
      throw new CommittError('INVALID_INPUT', 'agentId is required.');
    }
    const balance = await getClawPumpBalance(body.agentId);
    return Response.json(balance, { status: 200 });
  } catch (error) {
    const safe = publicError(error);
    return Response.json({ error: { code: safe.code, message: safe.message } }, { status: safe.status });
  }
}
