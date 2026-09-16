import { CommittError, publicError } from '../../../src/agent/errors';
import { parseCookies } from '../../../src/lib/cookies';
import { decryptSession } from '../../../src/lib/session';
import { listPublicRepos } from '../../../src/lib/githubOAuth';

/** The "read mode" step: once GitHub is connected, list every repo the agent can read. */
export async function GET(request: Request): Promise<Response> {
  try {
    const cookies = parseCookies(request.headers.get('cookie'));
    const token = cookies.committ_session;
    const session = token ? await decryptSession(token) : null;
    if (!session) throw new CommittError('NOT_CONNECTED', 'Connect your GitHub account first.', 401);

    const repos = await listPublicRepos(session.accessToken, session.login);
    return Response.json({ repos });
  } catch (error) {
    const safe = publicError(error);
    return Response.json({ error: { code: safe.code, message: safe.message } }, { status: safe.status });
  }
}
