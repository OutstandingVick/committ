import type { DeploymentPlan, TemplateId } from '../../domain/committ';
import { getTemplate } from '../../templates/registry';
import { CommittError } from '../errors';
import { prepareClawPumpLaunch } from '../../lib/clawpump';
import { getTipJarProgramAddress } from '../../solana/config';
import { TOKEN_2022_PROGRAM_ADDRESS } from '../../solana/token/instructions';
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
  const isToken = input.template === 'devnet-token';
  const authority = input.authority?.trim() || null;
  if (authority && !SOLANA_ADDRESS.test(authority)) {
    throw new CommittError('INVALID_AUTHORITY', 'Enter a valid Solana wallet address.');
  }

  // The token uses the standard Token-2022 program; the tip jar uses Committ's deployed program.
  const programId = isToken ? TOKEN_2022_PROGRAM_ADDRESS.toString() : getTipJarProgramAddress().toString();

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
    status: authority ? 'ready-for-wallet' : 'needs-authority',
    explorerUrl: `https://explorer.solana.com/address/${programId}?cluster=devnet`,
    blinkUrl: blink.toString(),
    checks: [
      'Target cluster is devnet.',
      'Template came from the fixed Committ registry.',
      'No repository code was generated or executed.',
      'No transaction has been signed or sent.',
      authority ? 'The developer supplied the authority address.' : 'A developer wallet is still required.',
      isToken
        ? 'Uses the standard Token-2022 program; no custom program is deployed.'
        : 'The deployed template program is configured.',
    ],
    tokenLaunch: prepareClawPumpLaunch(repo),
  };
}
