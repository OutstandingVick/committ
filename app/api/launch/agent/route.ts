import { publicError } from '../../../../src/agent/errors';
import { parseRepoUrl } from '../../../../src/agent/tools/parseRepoUrl';
import { createLaunchAgent } from '../../../../src/lib/clawpump';
import { CommittError } from '../../../../src/agent/errors';

/**
 * Creates a dedicated, private ClawPump agent (a fresh Solana wallet) for
 * one repository. This alone does not launch a token and costs nothing;
 * the caller still has to fund the returned wallet before /api/launch/execute
 * can run. Kept separate from /api/prepare because creating a wallet is a
 * distinct, lower-stakes step from spending SOL on a real launch.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json() as { repoUrl?: string; name?: string };
    if (!body.name || !body.name.trim()) {
      throw new CommittError('INVALID_INPUT', 'A token name is required.');
    }
    const repo = parseRepoUrl(body.repoUrl ?? '');
    const agent = await createLaunchAgent(repo, body.name.trim());
    return Response.json(agent, { status: 201 });
  } catch (error) {
    const safe = publicError(error);
    return Response.json({ error: { code: safe.code, message: safe.message } }, { status: safe.status });
  }
}
