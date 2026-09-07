import { sendDevnetRpcRequest, type DevnetRpc } from './rpc';
import type { UnsignedTransaction } from './transaction';

export interface SimulationReceipt {
  computeUnits: bigint | null;
  estimatedFeeLamports: bigint;
  logs: string[];
  status: 'passed';
}

export async function simulateAndPriceTransaction(
  rpc: DevnetRpc,
  transaction: UnsignedTransaction,
): Promise<SimulationReceipt> {
  const [simulation, fee] = await Promise.all([
    sendDevnetRpcRequest(rpc.simulateTransaction(transaction.wireBase64, {
      commitment: 'confirmed',
      encoding: 'base64',
      replaceRecentBlockhash: false,
      sigVerify: false,
    })),
    sendDevnetRpcRequest(rpc.getFeeForMessage(transaction.messageBase64, { commitment: 'confirmed' })),
  ]);

  if (simulation.value.err) {
    throw new Error(`Transaction simulation failed: ${formatSimulationError(simulation.value.err)}`);
  }
  if (fee.value === null) throw new Error('The devnet RPC could not estimate the transaction fee.');

  return {
    computeUnits: simulation.value.unitsConsumed ?? null,
    estimatedFeeLamports: fee.value,
    logs: (simulation.value.logs ?? []).slice(-12).map((line) => line.slice(0, 240)),
    status: 'passed',
  };
}

function formatSimulationError(error: unknown): string {
  if (typeof error === 'string') return error.slice(0, 160);
  try {
    return JSON.stringify(error).slice(0, 160);
  } catch {
    return 'unknown program error';
  }
}
