/**
 * Counts wallets whose first-ever signed Solana transaction was a Committ
 * transaction, derived entirely from public chain history. Nothing is stored,
 * and results are aggregates only: callers must never print wallet addresses.
 */

export interface SignatureInfo {
  signature: string;
  slot: bigint;
  failed: boolean;
}

export interface ChainReader {
  /** Newest-first page of signatures involving `address`, older than `before`. */
  signaturesFor(address: string, before?: string): Promise<SignatureInfo[]>;
  /** Signer addresses of a confirmed transaction, or null if unavailable. */
  signers(signature: string): Promise<string[] | null>;
  /** Oldest slot the RPC still serves history for. */
  firstAvailableSlot(): Promise<bigint>;
}

export interface FirstTxMetrics {
  programTransactions: number;
  totalWallets: number;
  firstTxWallets: number;
  /** Wallets whose history could not be read back far enough to decide. */
  undeterminedWallets: number;
}

export interface FirstTxOptions {
  /** Page cap per address, bounding RPC cost on long histories. */
  maxPages?: number;
}

async function allSignatures(reader: ChainReader, address: string, maxPages: number) {
  const pages: SignatureInfo[] = [];
  let before: string | undefined;
  for (let page = 0; page < maxPages; page += 1) {
    const batch = await reader.signaturesFor(address, before);
    if (batch.length === 0) return { signatures: pages, complete: true };
    pages.push(...batch);
    before = batch[batch.length - 1].signature;
  }
  return { signatures: pages, complete: false };
}

export async function computeFirstTxMetrics(
  reader: ChainReader,
  programAddress: string,
  options: FirstTxOptions = {},
): Promise<FirstTxMetrics> {
  const maxPages = options.maxPages ?? 20;
  const program = await allSignatures(reader, programAddress, maxPages);
  const committSignatures = new Set<string>();
  const wallets = new Set<string>();

  for (const info of program.signatures) {
    if (info.failed) continue;
    const signers = await reader.signers(info.signature);
    if (!signers?.length) continue;
    committSignatures.add(info.signature);
    wallets.add(signers[0]); // fee payer
  }

  const firstAvailable = await reader.firstAvailableSlot();
  let firstTxWallets = 0;
  let undeterminedWallets = 0;

  for (const wallet of wallets) {
    const history = await allSignatures(reader, wallet, maxPages);
    const oldestFirst = [...history.signatures].reverse();
    const truncated = !history.complete || (oldestFirst[0]?.slot ?? BigInt(0)) <= firstAvailable;

    let firstSigned: string | undefined;
    for (const info of oldestFirst) {
      const signers = await reader.signers(info.signature);
      if (signers?.includes(wallet)) {
        firstSigned = info.signature;
        break;
      }
    }

    if (truncated || !firstSigned) undeterminedWallets += 1;
    else if (committSignatures.has(firstSigned)) firstTxWallets += 1;
  }

  return {
    programTransactions: committSignatures.size,
    totalWallets: wallets.size,
    firstTxWallets,
    undeterminedWallets,
  };
}
