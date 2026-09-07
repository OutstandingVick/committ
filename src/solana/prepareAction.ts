import type { Address } from '@solana/kit';
import { CommittError } from '../agent/errors';
import { CAMPAIGN_ACCOUNT_SIZE, decodeCampaignAccount, equalBytes } from './accounts';
import type { TipJarActionRequest } from './actionRequest';
import { deriveCampaignAddress, hashRepository } from './campaign';
import { getTipJarProgramAddress } from './config';
import { getInitializeCampaignInstruction, getTipInstruction } from './instructions';
import { createDevnetRpc, fetchValidatedAccount, type DevnetRpc } from './rpc';
import { simulateAndPriceTransaction } from './simulation';
import { buildUnsignedTransaction } from './transaction';

export interface PreparedTipJarAction {
  message: string;
  transaction: string;
  meta: {
    amountLamports: string;
    campaign: Address;
    cluster: 'devnet';
    computeUnits: string | null;
    estimatedFeeLamports: string;
    estimatedRentLamports: string;
    feePayer: Address;
    lastValidBlockHeight: string;
    operation: TipJarActionRequest['operation'];
    programId: Address;
    simulation: 'passed';
  };
}

export async function prepareTipJarAction(
  request: TipJarActionRequest,
  dependencies: { rpc?: DevnetRpc } = {},
): Promise<PreparedTipJarAction> {
  const rpc = dependencies.rpc ?? createDevnetRpc();
  const programAddress = getTipJarProgramAddress();
  const repoHash = await hashRepository(request.repo.canonicalUrl);
  const [campaign] = await deriveCampaignAddress({
    authority: request.authority,
    programAddress,
    repoHash,
  });
  const account = await fetchValidatedAccount(rpc, campaign);

  let estimatedRentLamports = BigInt(0);
  const instruction = request.operation === 'initialize'
    ? (() => {
        if (account) throw new CommittError('CAMPAIGN_EXISTS', 'This repository tip jar already exists.', 409);
        return getInitializeCampaignInstruction({
          authority: request.authority,
          campaign,
          programAddress,
          repoHash,
        });
      })()
    : (() => {
        if (!account) throw new CommittError('CAMPAIGN_NOT_FOUND', 'Create this repository tip jar before tipping it.', 404);
        validateCampaign(account.owner, programAddress, account.data, request.authority, repoHash);
        return getTipInstruction({
          amountLamports: request.amountLamports!,
          campaign,
          programAddress,
          tipper: request.account,
        });
      })();

  if (request.operation === 'initialize') {
    estimatedRentLamports = await rpc.getMinimumBalanceForRentExemption(BigInt(CAMPAIGN_ACCOUNT_SIZE), {
      commitment: 'confirmed',
    }).send();
  }

  const transaction = await buildUnsignedTransaction({ feePayer: request.account, instruction, rpc });
  let simulation;
  try {
    simulation = await simulateAndPriceTransaction(rpc, transaction);
  } catch (cause) {
    throw new CommittError(
      'SIMULATION_FAILED',
      cause instanceof Error ? cause.message : 'The devnet simulation failed.',
      422,
    );
  }

  const amountLamports = request.amountLamports ?? BigInt(0);
  return {
    transaction: transaction.wireBase64,
    message: request.operation === 'initialize'
      ? `Create the devnet tip jar for ${request.repo.owner}/${request.repo.name}.`
      : `Tip ${request.repo.owner}/${request.repo.name} on Solana devnet.`,
    meta: {
      amountLamports: amountLamports.toString(),
      campaign,
      cluster: 'devnet',
      computeUnits: simulation.computeUnits?.toString() ?? null,
      estimatedFeeLamports: simulation.estimatedFeeLamports.toString(),
      estimatedRentLamports: estimatedRentLamports.toString(),
      feePayer: request.account,
      lastValidBlockHeight: transaction.lastValidBlockHeight.toString(),
      operation: request.operation,
      programId: programAddress,
      simulation: simulation.status,
    },
  };
}

function validateCampaign(
  owner: Address,
  programAddress: Address,
  data: Uint8Array,
  authority: Address,
  repoHash: Uint8Array,
): void {
  if (owner !== programAddress) throw new CommittError('INVALID_CAMPAIGN_OWNER', 'The campaign has an invalid owner.', 409);
  const campaign = decodeCampaignAccount(data);
  if (campaign.authority !== authority || !equalBytes(campaign.repoHash, repoHash)) {
    throw new CommittError('INVALID_CAMPAIGN_DATA', 'The campaign does not match this repository and authority.', 409);
  }
}
