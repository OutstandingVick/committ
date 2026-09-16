/** Minimal cookie helpers. The route handlers here use the raw Request/Response
 * Web APIs (matching the rest of this codebase), which do not parse cookies
 * for you, so this is a small, dependency-free stand-in. */

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) out[key] = safeDecode(value);
  }
  return out;
}

export interface CookieOptions {
  maxAgeSeconds: number;
  path?: string;
  sameSite?: 'Lax' | 'Strict' | 'None';
}

/** Every cookie this app sets is HttpOnly + Secure; nothing here is ever read by page JS. */
export function serializeCookie(name: string, value: string, options: CookieOptions): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path ?? '/'}`];
  parts.push(`Max-Age=${Math.max(0, options.maxAgeSeconds)}`);
  parts.push('HttpOnly');
  parts.push('Secure');
  parts.push(`SameSite=${options.sameSite ?? 'Lax'}`);
  return parts.join('; ');
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
