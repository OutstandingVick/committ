import { CommittError, publicError } from '../../../src/agent/errors';
import { parseSolanaAddress } from '../../../src/solana/config';
import { createDevnetRpc, fetchValidatedAccount } from '../../../src/solana/rpc';
import { TOKEN_2022_PROGRAM_ADDRESS } from '../../../src/solana/token/instructions';
import { parseTokenMetadata } from '../../../src/solana/token/metadata';
import { tokenMetadataUri } from '../../../src/solana/token/prepareToken';

export const dynamic = 'force-dynamic';

/**
 * Standard token metadata JSON for wallets and explorers, built from the
 * mint's on-chain Token-2022 fields. Serves only Committ-created mints (whose
 * on-chain URI points here). Stores nothing.
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    let mint;
    try {
      mint = parseSolanaAddress(url.searchParams.get('mint') ?? '', 'token mint');
    } catch {
      throw new CommittError('INVALID_MINT', 'The token mint address is invalid.');
    }
    const account = await fetchValidatedAccount(createDevnetRpc(), mint);
    const metadata = account && account.owner === TOKEN_2022_PROGRAM_ADDRESS ? parseTokenMetadata(account.data) : null;
    if (!metadata || metadata.mint !== mint || !isCommittUri(metadata.uri, mint)) {
      throw new CommittError('TOKEN_NOT_FOUND', 'No Committ token metadata exists for this mint.', 404);
    }
    const image = safeHttpsUrl(metadata.fields.image);
    const repository = safeHttpsUrl(metadata.fields.repository);
    return json({
      name: metadata.name,
      symbol: metadata.symbol,
      description: metadata.fields.description ?? '',
      ...(image ? { image } : {}),
      ...(repository ? { external_url: repository } : {}),
      properties: image ? { files: [{ uri: image, type: 'image/png' }], category: 'image' } : undefined,
    }, 200, 'public, max-age=300');
  } catch (error) {
    const safe = publicError(error);
    return json({ error: { code: safe.code, message: safe.message } }, safe.status, 'no-store');
  }
}

function isCommittUri(uri: string, mint: string): boolean {
  try {
    const parsed = new URL(uri);
    return parsed.toString() === tokenMetadataUri(parsed.origin, mint as never);
  } catch {
    return false;
  }
}

function safeHttpsUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function json(value: unknown, status: number, cache: string): Response {
  return Response.json(value, {
    status,
    headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': cache },
  });
}
