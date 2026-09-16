import { parseCookies } from '../../../../src/lib/cookies';
import { decryptSession } from '../../../../src/lib/session';
import type { GithubSession } from '../../../../src/domain/committ';

/** Tells the UI whether a GitHub account is connected, without ever exposing the access token. */
export async function GET(request: Request): Promise<Response> {
  const cookies = parseCookies(request.headers.get('cookie'));
  const token = cookies.committ_session;
  const stored = token ? await decryptSession(token) : null;

  const session: GithubSession | null = stored
    ? { login: stored.login, name: stored.name, avatarUrl: stored.avatarUrl }
    : null;
  return Response.json({ session });
}
