import type { Address } from '@solana/kit';
import type { RepoReference } from '../domain/committ';

export function createTipJarActionDescriptor(input: {
  authority: Address | null;
  origin: string;
  programConfigured: boolean;
  repo: RepoReference;
}) {
  const base = new URL('/api/actions/tip-jar', input.origin);
  base.searchParams.set('repo', input.repo.canonicalUrl);
  if (input.authority) base.searchParams.set('authority', input.authority);

  const initialize = new URL(base);
  initialize.searchParams.set('operation', 'initialize');
  const actions: Array<Record<string, unknown>> = [
    {
      type: 'transaction',
      label: 'Create devnet tip jar',
      href: initialize.toString(),
    },
  ];

  if (input.authority) {
    const fixedTip = new URL(base);
    fixedTip.searchParams.set('operation', 'tip');
    fixedTip.searchParams.set('amount', '0.01');
    const customTip = new URL(base);
    customTip.searchParams.set('operation', 'tip');
    customTip.searchParams.set('amount', '{amount}');
    actions.push(
      { type: 'transaction', label: 'Tip 0.01 devnet SOL', href: fixedTip.toString() },
      {
        type: 'transaction',
        label: 'Tip custom amount',
        href: customTip.toString(),
        parameters: [
          { name: 'amount', label: 'Devnet SOL amount', required: true, type: 'number', min: 0.001, max: 10 },
        ],
      },
    );
  }

  return {
    type: 'action',
    icon: `${input.origin}/favicon.svg`,
    title: `Tip ${input.repo.owner}/${input.repo.name}`,
    description: input.authority
      ? 'Create or fund this repository tip jar through the audited Committ program on Solana devnet.'
      : 'Connect the repository authority to create its audited Committ tip jar on Solana devnet.',
    label: input.authority ? 'Open devnet tip jar' : 'Create devnet tip jar',
    disabled: !input.programConfigured,
    error: input.programConfigured ? undefined : { message: 'The devnet program is not configured.' },
    links: { actions },
  };
}
