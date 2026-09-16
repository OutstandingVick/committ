import { CommittError, publicError } from '../../../../src/agent/errors';
import { syncClawPumpBilling } from '../../../../src/lib/clawpump';

/** Re-checks on-chain deposits against ClawPump's credit ledger. Call after a top-up that isn't showing up yet. */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json() as { agentId?: string };
    if (!body.agentId) {
      throw new CommittError('INVALID_INPUT', 'agentId is required.');
    }
    const balance = await syncClawPumpBilling(body.agentId);
    return Response.json(balance, { status: 200 });
  } catch (error) {
    const safe = publicError(error);
    return Response.json({ error: { code: safe.code, message: safe.message } }, { status: safe.status });
  }
}
