import { getAddressDecoder, getU64Decoder, type Address } from '@solana/kit';

export const CAMPAIGN_DISCRIMINATOR = Uint8Array.from([50, 40, 49, 11, 157, 220, 229, 192]);
export const CAMPAIGN_ACCOUNT_SIZE = 89;

export interface CampaignAccount {
  authority: Address;
  repoHash: Uint8Array;
  totalTipped: bigint;
  totalWithdrawn: bigint;
  bump: number;
}

export function decodeCampaignAccount(data: Uint8Array): CampaignAccount {
  if (data.byteLength !== CAMPAIGN_ACCOUNT_SIZE) {
    throw new Error('The campaign account has an unexpected size.');
  }
  if (!equalBytes(data.subarray(0, 8), CAMPAIGN_DISCRIMINATOR)) {
    throw new Error('The account is not a Committ campaign.');
  }

  return {
    authority: getAddressDecoder().decode(data.subarray(8, 40)),
    repoHash: data.slice(40, 72),
    totalTipped: getU64Decoder().decode(data.subarray(72, 80)),
    totalWithdrawn: getU64Decoder().decode(data.subarray(80, 88)),
    bump: data[88],
  };
}

export function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((value, index) => value === right[index]);
}
