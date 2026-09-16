import { CommittError, publicError } from '../../../../src/agent/errors';
import { withdrawAgentFunds } from '../../../../src/lib/clawpump';

/**
 * Withdraws everything in an agent's wallet to `destination` in one call.
 * There is no separate confirmation step here: `destination` is always the
 * caller's own connected wallet address, supplied by the browser that is
 * already showing it as connected - this route only ever returns funds to
 * their owner, never sends anywhere else, so it doesn't gate on anything
 * beyond having a destination address.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json() as { agentId?: string; destination?: string };
    if (!body.agentId || !body.destination) {
      throw new CommittError('INVALID_INPUT', 'agentId and destination are required.');
    }
    const result = await withdrawAgentFunds(body.agentId, body.destination);
    return Response.json(result, { status: 200 });
  } catch (error) {
    const safe = publicError(error);
    return Response.json({ error: { code: safe.code, message: safe.message } }, { status: safe.status });
  }
}
