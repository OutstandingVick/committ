import { publicError } from '../../../../src/agent/errors';
import { buildAuthorizeUrl } from '../../../../src/lib/githubOAuth';
import { serializeCookie } from '../../../../src/lib/cookies';

/** Starts GitHub sign-in: sends the browser to GitHub with a one-time state value. */
export async function GET(request: Request): Promise<Response> {
  try {
    const origin = new URL(request.url).origin;
    const redirectUri = `${origin}/api/auth/github/callback`;
    const state = crypto.randomUUID();
    const authorizeUrl = buildAuthorizeUrl(redirectUri, state);

    const headers = new Headers({ Location: authorizeUrl });
    headers.append('Set-Cookie', serializeCookie('committ_oauth_state', state, { maxAgeSeconds: 600 }));
    return new Response(null, { status: 302, headers });
  } catch (error) {
    const safe = publicError(error);
    return Response.json({ error: { code: safe.code, message: safe.message } }, { status: safe.status });
  }
}
