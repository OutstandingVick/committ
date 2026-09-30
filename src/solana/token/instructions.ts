import {
  AccountRole,
  address,
  getAddressEncoder,
  getU32Encoder,
  getU64Encoder,
  type Address,
  type Instruction,
} from '@solana/kit';
import { SYSTEM_PROGRAM_ADDRESS } from '../config';

/**
 * Hand-encoded instructions for the standard System, Token-2022, and
 * Associated Token Account programs. Layouts follow the programs' published
 * interfaces; devnet simulation verifies them before any wallet is asked to sign.
 */

export const TOKEN_2022_PROGRAM_ADDRESS = address('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
export const ASSOCIATED_TOKEN_PROGRAM_ADDRESS = address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

const addressBytes = getAddressEncoder();
const u32 = getU32Encoder();
const u64 = getU64Encoder();
const utf8 = new TextEncoder();

// Token-2022 instruction indices.
const INITIALIZE_MINT_2 = 20;
const MINT_TO = 7;
const SET_AUTHORITY = 6;
const METADATA_POINTER_EXTENSION = 39;
const METADATA_POINTER_INITIALIZE = 0;
const AUTHORITY_TYPE_MINT_TOKENS = 0;

/** First 8 bytes of sha256("spl_token_metadata_interface:initialize_account"). */
export const TOKEN_METADATA_INITIALIZE_DISCRIMINATOR = Uint8Array.from([210, 225, 30, 162, 88, 184, 77, 141]);

export function getCreateAccountWithSeedInstruction(input: {
  payer: Address;
  newAccount: Address;
  seed: string;
  lamports: bigint;
  space: bigint;
  owner: Address;
}): Instruction {
  const seed = utf8.encode(input.seed);
  if (seed.byteLength > 32) throw new Error('Account seeds are limited to 32 bytes.');
  return {
    programAddress: SYSTEM_PROGRAM_ADDRESS,
    accounts: [
      { address: input.payer, role: AccountRole.WRITABLE_SIGNER },
      { address: input.newAccount, role: AccountRole.WRITABLE },
    ],
    data: concatBytes(
      bytes(u32.encode(3)),
      bytes(addressBytes.encode(input.payer)),
      bytes(u64.encode(BigInt(seed.byteLength))),
      seed,
      bytes(u64.encode(input.lamports)),
      bytes(u64.encode(input.space)),
      bytes(addressBytes.encode(input.owner)),
    ),
  };
}

export function getInitializeMetadataPointerInstruction(input: { mint: Address; authority: Address }): Instruction {
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [{ address: input.mint, role: AccountRole.WRITABLE }],
    data: concatBytes(
      Uint8Array.of(METADATA_POINTER_EXTENSION, METADATA_POINTER_INITIALIZE),
      bytes(addressBytes.encode(input.authority)),
      bytes(addressBytes.encode(input.mint)), // metadata lives in the mint itself
    ),
  };
}

export function getInitializeMint2Instruction(input: { mint: Address; decimals: number; mintAuthority: Address }): Instruction {
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [{ address: input.mint, role: AccountRole.WRITABLE }],
    data: concatBytes(
      Uint8Array.of(INITIALIZE_MINT_2, input.decimals),
      bytes(addressBytes.encode(input.mintAuthority)),
      Uint8Array.of(0), // no freeze authority
    ),
  };
}

export function getInitializeTokenMetadataInstruction(input: {
  mint: Address;
  authority: Address;
  name: string;
  symbol: string;
  uri: string;
}): Instruction {
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: input.mint, role: AccountRole.WRITABLE },
      { address: input.authority, role: AccountRole.READONLY }, // update authority
      { address: input.mint, role: AccountRole.READONLY },
      { address: input.authority, role: AccountRole.READONLY_SIGNER }, // mint authority
    ],
    data: concatBytes(
      TOKEN_METADATA_INITIALIZE_DISCRIMINATOR,
      borshString(input.name),
      borshString(input.symbol),
      borshString(input.uri),
    ),
  };
}

export function getCreateAssociatedTokenAccountIdempotentInstruction(input: {
  payer: Address;
  ata: Address;
  owner: Address;
  mint: Address;
}): Instruction {
  return {
    programAddress: ASSOCIATED_TOKEN_PROGRAM_ADDRESS,
    accounts: [
      { address: input.payer, role: AccountRole.WRITABLE_SIGNER },
      { address: input.ata, role: AccountRole.WRITABLE },
      { address: input.owner, role: AccountRole.READONLY },
      { address: input.mint, role: AccountRole.READONLY },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      { address: TOKEN_2022_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data: Uint8Array.of(1),
  };
}

export function getMintToInstruction(input: { mint: Address; destination: Address; authority: Address; amount: bigint }): Instruction {
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: input.mint, role: AccountRole.WRITABLE },
      { address: input.destination, role: AccountRole.WRITABLE },
      { address: input.authority, role: AccountRole.READONLY_SIGNER },
    ],
    data: concatBytes(Uint8Array.of(MINT_TO), bytes(u64.encode(input.amount))),
  };
}

/** Permanently removes the mint authority so supply can never change. */
export function getRevokeMintAuthorityInstruction(input: { mint: Address; authority: Address }): Instruction {
  return {
    programAddress: TOKEN_2022_PROGRAM_ADDRESS,
    accounts: [
      { address: input.mint, role: AccountRole.WRITABLE },
      { address: input.authority, role: AccountRole.READONLY_SIGNER },
    ],
    data: Uint8Array.of(SET_AUTHORITY, AUTHORITY_TYPE_MINT_TOKENS, 0),
  };
}

function borshString(value: string): Uint8Array {
  const encoded = utf8.encode(value);
  return concatBytes(bytes(u32.encode(encoded.byteLength)), encoded);
}

function bytes(value: ArrayLike<number>): Uint8Array {
  return Uint8Array.from(value);
}

export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(arrays.reduce((total, value) => total + value.byteLength, 0));
  let offset = 0;
  for (const value of arrays) {
    output.set(value, offset);
    offset += value.byteLength;
  }
  return output;
}
