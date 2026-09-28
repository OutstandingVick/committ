export interface SmokeArgs {
  wallet?: string;
  repository: string;
  hostedUrl?: string;
}

const DEFAULT_REPOSITORY = 'https://github.com/OutstandingVick/committ';

/** Parse `<wallet> [repo] [--url <origin>]` for the Blink smoke test. */
export function parseSmokeArgs(argv: string[]): SmokeArgs {
  const positional: string[] = [];
  let hostedUrl: string | undefined;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--url') {
      hostedUrl = argv[i + 1]?.trim();
      i += 1;
    } else {
      positional.push(argv[i]);
    }
  }
  if (hostedUrl !== undefined) {
    const parsed = new URL(hostedUrl);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
      throw new Error('--url must use HTTPS.');
    }
    hostedUrl = parsed.origin;
  }
  return {
    wallet: positional[0]?.trim() || undefined,
    repository: positional[1]?.trim() || DEFAULT_REPOSITORY,
    hostedUrl,
  };
}

/** Show which RPC host is in use without its path, query string, or credentials. */
export function redactRpcUrl(value: string): string {
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}${parsed.search || parsed.pathname.length > 1 ? '/…' : ''}`;
  } catch {
    return '(invalid URL)';
  }
}

/** Explain a non-JSON response (e.g. a hosting login page) instead of failing to parse it. */
export function describeNonJsonResponse(status: number, contentType: string | null, body: string): string | null {
  if (contentType?.includes('application/json')) return null;
  if (status === 401 || /login-required|Log in to access/i.test(body)) {
    return 'The site requires sign-in, so this request never reached Committ. '
      + 'Run the POST from a signed-in browser console instead (see docs/deployment.md).';
  }
  return `Expected JSON from the action route but got ${contentType ?? 'no content type'} (HTTP ${status}).`;
}
