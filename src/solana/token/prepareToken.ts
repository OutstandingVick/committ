import { createAddressWithSeed, getAddressEncoder, getBase64Encoder, getProgramDerivedAddress, type Address } from '@solana/kit';
import { CommittError } from '../../agent/errors';
import type { RepoReference } from '../../domain/committ';
import { hashRepository } from '../campaign';
import { createDevnetRpc, fetchValidatedAccount, sendDevnetRpcRequest, type DevnetRpc } from '../rpc';
import { simulateAndPriceTransaction } from '../simulation';
import { buildUnsignedTransaction } from '../transaction';
import {
  ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
  TOKEN_2022_PROGRAM_ADDRESS,
  getCreateAccountWithSeedInstruction,
  getCreateAssociatedTokenAccountIdempotentInstruction,
  getInitializeMetadataPointerInstruction,
  getInitializeMint2Instruction,
  getInitializeTokenMetadataInstruction,
  getMintToInstruction,
  getUpdateTokenMetadataFieldInstruction,
  getRevokeMintAuthorityInstruction,
} from './instructions';
import { TOKEN_DECIMALS, validateTokenDraft, type TokenDraft } from './draft';

/** Base mint (82) padded to account size (165) + account type (1) + metadata pointer TLV (4 + 64). */
export const MINT_WITH_METADATA_POINTER_SIZE = 234;
/** Token-2022 account (165) + account type (1) + immutable owner TLV (4). */
export const TOKEN_ACCOUNT_SIZE = 170;
/** Solana's maximum serialized transaction size. */
const MAX_TRANSACTION_BYTES = 1232;

export interface PreparedTokenLaunch {
  message: string;
  transaction: string;
  meta: {
    cluster: 'devnet';
    operation: 'create-token';
    programId: Address;
    mint: Address;
    tokenAccount: Address;
    feePayer: Address;
    name: string;
    symbol: string;
    uri: string;
    description: string;
    image: string;
    supply: string;
    decimals: number;
    mintAuthority: 'revoked';
    freezeAuthority: 'none';
    computeUnits: string | null;
    estimatedFeeLamports: string;
    estimatedRentLamports: string;
    lastValidBlockHeight: string;
    simulation: 'passed';
  };
}

/** Seed is unique per repository; the mint address is also bound to the creator wallet. */
export async function tokenSeed(repo: RepoReference): Promise<string> {
  const hash = await hashRepository(repo.canonicalUrl);
  return `committ:${Array.from(hash.subarray(0, 12), (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

export async function deriveTokenAddresses(creator: Address, repo: RepoReference) {
  const seed = await tokenSeed(repo);
  const mint = await createAddressWithSeed({ baseAddress: creator, programAddress: TOKEN_2022_PROGRAM_ADDRESS, seed });
  const encoder = getAddressEncoder();
  const [tokenAccount] = await getProgramDerivedAddress({
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
    seeds: [encoder.encode(creator), encoder.encode(TOKEN_2022_PROGRAM_ADDRESS), encoder.encode(mint)],
  });
  return { seed, mint, tokenAccount };
}

export function metadataSize(name: string, symbol: string, uri: string, fields: readonly (readonly [string, string])[] = []): number {
  const encoded = (value: string) => 4 + new TextEncoder().encode(value).byteLength;
  const additional = fields.reduce((total, [key, value]) => total + encoded(key) + encoded(value), 0);
  // TLV header + update authority + mint + name + symbol + uri + additional-metadata vec
  return 4 + 32 + 32 + encoded(name) + encoded(symbol) + encoded(uri) + 4 + additional;
}

/** The metadata URI serves standard token JSON built from the on-chain fields. */
export function tokenMetadataUri(origin: string, mint: Address): string {
  const url = new URL('/api/token-metadata', origin);
  url.searchParams.set('mint', mint);
  return url.toString();
}

export async function prepareTokenLaunch(
  input: { creator: Address; repo: RepoReference; draft: TokenDraft; metadataOrigin: string },
  dependencies: { rpc?: DevnetRpc } = {},
): Promise<PreparedTokenLaunch> {
  const rpc = dependencies.rpc ?? createDevnetRpc();
  const draft = validateTokenDraft(input.draft);
  const { seed, mint, tokenAccount } = await deriveTokenAddresses(input.creator, input.repo);
  const uri = tokenMetadataUri(input.metadataOrigin, mint);
  const fields = [
    ['description', draft.description],
    ['image', draft.image],
    ['repository', input.repo.canonicalUrl],
  ] as const;

  if (await fetchValidatedAccount(rpc, mint)) {
    throw new CommittError('TOKEN_EXISTS', 'You already created a token for this repository.', 409);
  }

  const space = BigInt(MINT_WITH_METADATA_POINTER_SIZE);
  const totalSize = BigInt(MINT_WITH_METADATA_POINTER_SIZE + metadataSize(draft.name, draft.symbol, uri, fields));
  const [lamports, tokenAccountRent] = await Promise.all([
    sendDevnetRpcRequest(rpc.getMinimumBalanceForRentExemption(totalSize, { commitment: 'confirmed' })),
    sendDevnetRpcRequest(rpc.getMinimumBalanceForRentExemption(BigInt(TOKEN_ACCOUNT_SIZE), { commitment: 'confirmed' })),
  ]);
  const amount = draft.supply * BigInt(10) ** BigInt(TOKEN_DECIMALS);

  const transaction = await buildUnsignedTransaction({
    feePayer: input.creator,
    rpc,
    instructions: [
      getCreateAccountWithSeedInstruction({ payer: input.creator, newAccount: mint, seed, lamports, space, owner: TOKEN_2022_PROGRAM_ADDRESS }),
      getInitializeMetadataPointerInstruction({ mint, authority: input.creator }),
      getInitializeMint2Instruction({ mint, decimals: TOKEN_DECIMALS, mintAuthority: input.creator }),
      getInitializeTokenMetadataInstruction({ mint, authority: input.creator, name: draft.name, symbol: draft.symbol, uri }),
      ...fields.map(([key, value]) => getUpdateTokenMetadataFieldInstruction({ mint, authority: input.creator, key, value })),
      getCreateAssociatedTokenAccountIdempotentInstruction({ payer: input.creator, ata: tokenAccount, owner: input.creator, mint }),
      getMintToInstruction({ mint, destination: tokenAccount, authority: input.creator, amount }),
      getRevokeMintAuthorityInstruction({ mint, authority: input.creator }),
    ],
  });

  if (getBase64Encoder().encode(transaction.wireBase64).byteLength > MAX_TRANSACTION_BYTES) {
    throw new CommittError('TOKEN_METADATA_TOO_LARGE', 'The token details are too long for one transaction. Shorten the description or image URL.');
  }

  let simulation;
  try {
    simulation = await simulateAndPriceTransaction(rpc, transaction);
  } catch (cause) {
    throw new CommittError('SIMULATION_FAILED', cause instanceof Error ? cause.message : 'The devnet simulation failed.', 422);
  }

  return {
    transaction: transaction.wireBase64,
    message: `Create the devnet token ${draft.symbol} for ${input.repo.owner}/${input.repo.name}.`,
    meta: {
      cluster: 'devnet',
      operation: 'create-token',
      programId: TOKEN_2022_PROGRAM_ADDRESS,
      mint,
      tokenAccount,
      feePayer: input.creator,
      name: draft.name,
      symbol: draft.symbol,
      uri,
      description: draft.description,
      image: draft.image,
      supply: draft.supply.toString(),
      decimals: TOKEN_DECIMALS,
      mintAuthority: 'revoked',
      freezeAuthority: 'none',
      computeUnits: simulation.computeUnits?.toString() ?? null,
      estimatedFeeLamports: simulation.estimatedFeeLamports.toString(),
      estimatedRentLamports: (lamports + tokenAccountRent).toString(),
      lastValidBlockHeight: transaction.lastValidBlockHeight.toString(),
      simulation: simulation.status,
    },
  };
}
