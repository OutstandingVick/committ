import { publicError } from '../../../../src/agent/errors';
import { getTransactionConfirmation } from '../../../../src/solana/confirmation';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ signature: string }> },
): Promise<Response> {
  try {
    const { signature } = await context.params;
    return Response.json(await getTransactionConfirmation(signature), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const safe = publicError(error);
    return Response.json(
      { error: { code: safe.code, message: safe.message } },
      { status: safe.status, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
