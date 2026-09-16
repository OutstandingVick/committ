import { serializeCookie } from '../../../../src/lib/cookies';

export async function POST(): Promise<Response> {
  const headers = new Headers();
  headers.append('Set-Cookie', serializeCookie('committ_session', '', { maxAgeSeconds: 0 }));
  return Response.json({ ok: true }, { headers });
}
