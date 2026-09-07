import {
  AccountRole,
  getU64Encoder,
  type Address,
  type Instruction,
} from '@solana/kit';
import { SYSTEM_PROGRAM_ADDRESS } from './config';

export const INITIALIZE_DISCRIMINATOR = Uint8Array.from([175, 175, 109, 31, 13, 152, 155, 237]);
export const TIP_DISCRIMINATOR = Uint8Array.from([77, 164, 35, 21, 36, 121, 213, 51]);

export function getInitializeCampaignInstruction(input: {
  authority: Address;
  campaign: Address;
  programAddress: Address;
  repoHash: Uint8Array;
}): Instruction {
  if (input.repoHash.byteLength !== 32) throw new Error('Repository hashes must be 32 bytes.');
  return {
    programAddress: input.programAddress,
    accounts: [
      { address: input.campaign, role: AccountRole.WRITABLE },
      { address: input.authority, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data: concatBytes(INITIALIZE_DISCRIMINATOR, input.repoHash),
  };
}

export function getTipInstruction(input: {
  amountLamports: bigint;
  campaign: Address;
  programAddress: Address;
  tipper: Address;
}): Instruction {
  if (input.amountLamports <= BigInt(0)) throw new Error('The tip amount must be greater than zero.');
  return {
    programAddress: input.programAddress,
    accounts: [
      { address: input.campaign, role: AccountRole.WRITABLE },
      { address: input.tipper, role: AccountRole.WRITABLE_SIGNER },
      { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
    ],
    data: concatBytes(TIP_DISCRIMINATOR, new Uint8Array(getU64Encoder().encode(input.amountLamports))),
  };
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(arrays.reduce((total, value) => total + value.byteLength, 0));
  let offset = 0;
  for (const value of arrays) {
    output.set(value, offset);
    offset += value.byteLength;
  }
  return output;
}
