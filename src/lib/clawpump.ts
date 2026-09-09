import type { RepoReference, TokenLaunchPlan } from '../domain/committ';

/** Describe the token launch boundary without invoking an irreversible CLI command. */
export function prepareClawPumpLaunch(repo: RepoReference): TokenLaunchPlan {
  const name = humanize(repo.name).slice(0, 80);
  const ticker = repo.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10) || 'COMMIT';
  return {
    provider: 'ClawPump',
    status: 'not-implemented',
    name,
    ticker,
    safeguards: [
      'Token execution is not implemented.',
      'Token launch must remain separate from devnet program preparation.',
      'The launch command is never run during repository analysis.',
      'A second explicit confirmation is required because launch is irreversible.',
      'Post-launch reinvestment is disabled by default.',
      'Committ stores no launch-provider credential.',
    ],
  };
}

function humanize(value: string): string {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
