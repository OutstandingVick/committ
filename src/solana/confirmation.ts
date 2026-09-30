import { signature as parseSignature, type Signature } from '@solana/kit';
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
  const confirmed = status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized';

  return {
    signature: transactionSignature,
    confirmationStatus: status?.confirmationStatus ?? 'not-found',
    confirmed,
    feeLamports: confirmed ? await readPaidFee(rpc, transactionSignature) : null,
    error: status?.err ? JSON.stringify(status.err).slice(0, 180) : null,
    explorerUrl: `https://explorer.solana.com/tx/${transactionSignature}?cluster=devnet`,
  };
}

/**
 * The fee actually charged, including any priority fee the wallet added after
 * review. Best effort: confirmation must not fail if the lookup does.
 */
async function readPaidFee(rpc: DevnetRpc, transactionSignature: Signature): Promise<string | null> {
  try {
    const transaction = await rpc.getTransaction(transactionSignature, {
      commitment: 'confirmed',
      encoding: 'json',
      maxSupportedTransactionVersion: 0,
    }).send();
    return transaction?.meta ? transaction.meta.fee.toString() : null;
  } catch {
    return null;
  }
}
