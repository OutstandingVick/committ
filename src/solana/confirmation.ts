import { signature as parseSignature } from '@solana/kit';
import { CommittError } from '../agent/errors';
import { createDevnetRpc, type DevnetRpc } from './rpc';

export async function getTransactionConfirmation(
  value: string,
  dependencies: { rpc?: DevnetRpc } = {},
) {
  let transactionSignature;
  try {
    transactionSignature = parseSignature(value);
  } catch {
    throw new CommittError('INVALID_SIGNATURE', 'The transaction signature is invalid.');
  }

  const rpc = dependencies.rpc ?? createDevnetRpc();
  const response = await rpc.getSignatureStatuses([transactionSignature], {
    searchTransactionHistory: true,
  }).send();
  const status = response.value[0];

  return {
    signature: transactionSignature,
    confirmationStatus: status?.confirmationStatus ?? 'not-found',
    confirmed: status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized',
    error: status?.err ? JSON.stringify(status.err).slice(0, 180) : null,
    explorerUrl: `https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`,
  };
}
