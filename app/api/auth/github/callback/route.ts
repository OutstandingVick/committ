import { CommittError, publicError } from '../../../../../src/agent/errors';
import { exchangeCodeForToken, fetchGithubUser } from '../../../../../src/lib/githubOAuth';
import { parseCookies, serializeCookie } from '../../../../../src/lib/cookies';
import { encryptSession } from '../../../../../src/lib/session';

/** GitHub redirects here after the user approves (or denies) sign-in. */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const origin = url.origin;

  try {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const cookies = parseCookies(request.headers.get('cookie'));

    if (!code || !state || !cookies.committ_oauth_state || state !== cookies.committ_oauth_state) {
      throw new CommittError('GITHUB_OAUTH_STATE_MISMATCH', 'That sign-in link expired. Try connecting again.', 400);
    }

    const redirectUri = `${origin}/api/auth/github/callback`;
    const accessToken = await exchangeCodeForToken(code, redirectUri);
    const profile = await fetchGithubUser(accessToken);
    const sessionToken = await encryptSession({ ...profile, accessToken });

    const headers = new Headers({ Location: `${origin}/launch` });
    headers.append('Set-Cookie', serializeCookie('committ_session', sessionToken, { maxAgeSeconds: 60 * 60 * 24 * 7 }));
    headers.append('Set-Cookie', serializeCookie('committ_oauth_state', '', { maxAgeSeconds: 0 }));
    return new Response(null, { status: 302, headers });
  } catch (error) {
    const safe = publicError(error);
    const headers = new Headers({ Location: `${origin}/launch?connectError=${encodeURIComponent(safe.code)}` });
    headers.append('Set-Cookie', serializeCookie('committ_oauth_state', '', { maxAgeSeconds: 0 }));
    return new Response(null, { status: 302, headers });
  }
}
