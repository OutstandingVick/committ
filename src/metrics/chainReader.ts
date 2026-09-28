import { address, signature } from '@solana/kit';
import { createDevnetRpc, sendDevnetRpcRequest, type DevnetRpc } from '../solana/rpc';
import type { ChainReader } from './firstTx';

const PAGE_SIZE = 1000;

export function createChainReader(rpc: DevnetRpc = createDevnetRpc()): ChainReader {
  return {
    async signaturesFor(account, before) {
      const page = await sendDevnetRpcRequest(rpc.getSignaturesForAddress(address(account), {
        commitment: 'confirmed',
        limit: PAGE_SIZE,
        ...(before ? { before: signature(before) } : {}),
      }));
      return page.map((info) => ({ signature: info.signature, slot: info.slot, failed: info.err !== null }));
    },
    async signers(value) {
      const transaction = await sendDevnetRpcRequest(rpc.getTransaction(signature(value), {
        commitment: 'confirmed',
        encoding: 'json',
        maxSupportedTransactionVersion: 0,
      }));
      if (!transaction) return null;
      const { accountKeys, header } = transaction.transaction.message;
      return accountKeys.slice(0, header.numRequiredSignatures).map(String);
    },
    async firstAvailableSlot() {
      return sendDevnetRpcRequest(rpc.getFirstAvailableBlock());
    },
  };
}
