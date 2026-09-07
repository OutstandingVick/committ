import {
  getAddressEncoder,
  getProgramDerivedAddress,
  type Address,
  type ProgramDerivedAddressBump,
} from '@solana/kit';

const CAMPAIGN_SEED = new TextEncoder().encode('campaign');
const addressEncoder = getAddressEncoder();

export async function hashRepository(canonicalUrl: string): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalUrl)),
  );
}

export async function deriveCampaignAddress(input: {
  authority: Address;
  programAddress: Address;
  repoHash: Uint8Array;
}): Promise<readonly [Address, ProgramDerivedAddressBump]> {
  if (input.repoHash.byteLength !== 32) {
    throw new Error('Repository hashes must be exactly 32 bytes.');
  }
  return getProgramDerivedAddress({
    programAddress: input.programAddress,
    seeds: [CAMPAIGN_SEED, addressEncoder.encode(input.authority), input.repoHash],
  });
}
