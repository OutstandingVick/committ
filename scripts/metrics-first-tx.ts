import { createChainReader } from '../src/metrics/chainReader';
import { computeFirstTxMetrics } from '../src/metrics/firstTx';
import { getTipJarProgramAddress } from '../src/solana/config';

// Aggregates only. Never print wallet addresses or signatures from this script.
const metrics = await computeFirstTxMetrics(createChainReader(), getTipJarProgramAddress());
console.log(JSON.stringify({ cluster: 'devnet', asOf: new Date().toISOString(), ...metrics }, null, 2));
if (metrics.undeterminedWallets > 0) {
  console.log('Some wallet histories predate the RPC\'s available history, so their first transaction is unknown.');
}
