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
