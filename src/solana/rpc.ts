import {
  createSolanaRpc,
  devnet,
  getBase64Encoder,
  type Address,
} from '@solana/kit';
import { getDevnetRpcUrl } from './config';

export function createDevnetRpc() {
  return createSolanaRpc(devnet(getDevnetRpcUrl()));
}

export type DevnetRpc = ReturnType<typeof createDevnetRpc>;

export interface ValidatedAccount {
  data: Uint8Array;
  executable: boolean;
  lamports: bigint;
  owner: Address;
}

export async function fetchValidatedAccount(
  rpc: DevnetRpc,
  accountAddress: Address,
): Promise<ValidatedAccount | null> {
  const response = await rpc.getAccountInfo(accountAddress, {
    commitment: 'confirmed',
    encoding: 'base64',
  }).send();
  if (!response.value) return null;

  const [encoded, encoding] = response.value.data;
  if (encoding !== 'base64') throw new Error('The RPC returned an unsupported account encoding.');

  return {
    data: new Uint8Array(getBase64Encoder().encode(encoded)),
    executable: response.value.executable,
    lamports: response.value.lamports,
    owner: response.value.owner,
  };
}
