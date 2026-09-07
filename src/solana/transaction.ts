import {
  appendTransactionMessageInstruction,
  compileTransaction,
  createTransactionMessage,
  getBase64Decoder,
  getBase64EncodedWireTransaction,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Base64EncodedWireTransaction,
  type Instruction,
  type Transaction,
  type TransactionMessageBytesBase64,
} from '@solana/kit';
import type { DevnetRpc } from './rpc';

export interface UnsignedTransaction {
  blockhash: string;
  lastValidBlockHeight: bigint;
  messageBase64: TransactionMessageBytesBase64;
  transaction: Transaction;
  wireBase64: Base64EncodedWireTransaction;
}

export async function buildUnsignedTransaction(input: {
  feePayer: Address;
  instruction: Instruction;
  rpc: DevnetRpc;
}): Promise<UnsignedTransaction> {
  const { value: lifetime } = await input.rpc.getLatestBlockhash({ commitment: 'confirmed' }).send();
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (current) => setTransactionMessageFeePayer(input.feePayer, current),
    (current) => setTransactionMessageLifetimeUsingBlockhash(lifetime, current),
    (current) => appendTransactionMessageInstruction(input.instruction, current),
  );
  const transaction = compileTransaction(message);

  return {
    blockhash: lifetime.blockhash,
    lastValidBlockHeight: lifetime.lastValidBlockHeight,
    messageBase64: getBase64Decoder().decode(transaction.messageBytes) as TransactionMessageBytesBase64,
    transaction,
    wireBase64: getBase64EncodedWireTransaction(transaction),
  };
}
