import { CommittError, publicError } from '../../../../src/agent/errors';
import { executeLaunch } from '../../../../src/lib/clawpump';

/**
 * Spends real SOL from an already-created, already-funded ClawPump agent
 * wallet to launch a token on pump.fun. Irreversible.
 *
 * This route is the single place that is allowed to trigger that spend, and
 * it refuses unless `confirmLaunch: true` is present on THIS request body -
 * a UI checkbox ticked earlier is not enough, the confirmation must arrive
 * fresh with the launch call itself.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json() as {
      agentId?: string;
      name?: string;
      ticker?: string;
      description?: string;
      imageUrl?: string;
      firstBuySol?: number;
      confirmLaunch?: boolean;
    };

    if (body.confirmLaunch !== true) {
      throw new CommittError('CONFIRMATION_REQUIRED', 'Confirm the launch before it can run.');
    }
    if (!body.agentId || !body.name || !body.ticker || !body.description) {
      throw new CommittError('INVALID_INPUT', 'agentId, name, ticker, and description are required.');
    }
    if (body.firstBuySol !== undefined && (typeof body.firstBuySol !== 'number' || body.firstBuySol < 0 || body.firstBuySol > 85)) {
      throw new CommittError('INVALID_INPUT', 'firstBuySol must be a number between 0 and 85.');
    }

    const result = await executeLaunch({
      agentId: body.agentId,
      name: body.name,
      ticker: body.ticker,
      description: body.description,
      imageUrl: body.imageUrl,
      firstBuySol: body.firstBuySol,
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    const safe = publicError(error);
    return Response.json({ error: { code: safe.code, message: safe.message } }, { status: safe.status });
  }
}
