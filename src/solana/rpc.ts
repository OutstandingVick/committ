import {
  createSolanaRpc,
  devnet,
  getBase64Encoder,
  type Address,
} from '@solana/kit';
import { CommittError } from '../agent/errors';
import { getDevnetRpcUrl } from './config';

export function createDevnetRpc() {
  return createSolanaRpc(devnet(getDevnetRpcUrl()));
}

export type DevnetRpc = ReturnType<typeof createDevnetRpc>;

export async function sendDevnetRpcRequest<T>(request: { send(): Promise<T> }): Promise<T> {
  const delays = [500, 1_000, 2_000];
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await request.send();
    } catch {
      if (attempt >= delays.length) {
        throw new CommittError(
          'DEVNET_RPC_UNAVAILABLE',
          'The Solana devnet RPC is temporarily unavailable. Try again shortly.',
          503,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
}

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
  const response = await sendDevnetRpcRequest(rpc.getAccountInfo(accountAddress, {
    commitment: 'confirmed',
    encoding: 'base64',
  }));
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
