import type { DeploymentPlan, TemplateId } from '../../domain/committ';
import { getTemplate } from '../../templates/registry';
import { CommittError } from '../errors';
import { prepareClawPumpLaunch } from '../../lib/clawpump';
import { parseRepoUrl } from './parseRepoUrl';

const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

interface PrepareInput {
  analysisId: string;
  repoUrl: string;
  template: TemplateId;
  authority?: string;
  confirmed: boolean;
  origin: string;
}

/** Prepare a transparent devnet plan. This function never signs or sends a transaction. */
export function prepareDeployment(input: PrepareInput): DeploymentPlan {
  if (!input.confirmed) {
    throw new CommittError('CONFIRMATION_REQUIRED', 'Review and confirm the template before continuing.');
  }
  if (!/^[a-f0-9-]{8,64}$/i.test(input.analysisId)) {
    throw new CommittError('INVALID_ANALYSIS', 'The analysis reference is not valid.');
  }

  const repo = parseRepoUrl(input.repoUrl);
  getTemplate(input.template);
  const authority = input.authority?.trim() || null;
  if (authority && !SOLANA_ADDRESS.test(authority)) {
    throw new CommittError('INVALID_AUTHORITY', 'Enter a valid Solana wallet address.');
  }

  const programId = process.env.COMMITT_TIP_JAR_PROGRAM_ID?.trim() || null;
  if (programId && !SOLANA_ADDRESS.test(programId)) {
    throw new CommittError('INVALID_PROGRAM_CONFIG', 'The configured tip-jar program address is invalid.', 500);
  }

  const blink = new URL('/api/actions/tip-jar', input.origin);
  blink.searchParams.set('repo', repo.canonicalUrl);
  if (authority) blink.searchParams.set('authority', authority);

  return {
    analysisId: input.analysisId,
    cluster: 'devnet',
    template: input.template,
    repository: repo.canonicalUrl,
    programId,
    authority,
    status: programId && authority ? 'ready-for-wallet' : 'needs-wallet',
    explorerUrl: programId
      ? `https://explorer.solana.com/address/${programId}?cluster=devnet`
      : null,
    blinkUrl: blink.toString(),
    checks: [
      'Target cluster is devnet.',
      'Template came from the fixed Committ registry.',
      'No repository code was generated or executed.',
      'No transaction has been signed or sent.',
      authority ? 'The developer supplied the authority address.' : 'A developer wallet is still required.',
      programId ? 'The deployed template program is configured.' : 'Program deployment is still required.',
    ],
    tokenLaunch: prepareClawPumpLaunch(repo),
  };
}
