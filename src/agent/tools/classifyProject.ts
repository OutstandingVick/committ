import type {
  ClassificationEvidence,
  ProjectClassification,
  RepoSnapshot,
} from '../../domain/committ';

const KIND_SIGNALS: Record<ProjectClassification['projectKind'], RegExp[]> = {
  'web-app': [/flask/i, /fastapi/i, /express/i, /next\.js/i, /django/i, /web app/i],
  bot: [/discord/i, /slack bot/i, /telegram/i, /bot\b/i],
  cli: [/command[- ]line/i, /\bcli\b/i, /commander/i, /click\b/i, /argparse/i],
  library: [/npm install/i, /pip install/i, /library/i, /package/i],
  unknown: [],
};

/**
 * Classify bounded text as data, purely to describe the repository in plain
 * language. This never selects or generates code - it only informs the
 * summary shown to the developer before a ClawPump token identity is
 * drafted for the repo.
 */
export function classifyProject(snapshot: RepoSnapshot): ProjectClassification {
  const corpus = [
    snapshot.description ?? '',
    snapshot.primaryLanguage ?? '',
    snapshot.topics.join(' '),
    ...snapshot.files.map((file) => `${file.path}\n${file.content}`),
  ].join('\n');

  const kindScores = Object.fromEntries(
    Object.entries(KIND_SIGNALS).map(([kind, patterns]) => [
      kind,
      patterns.reduce((score, pattern) => score + (pattern.test(corpus) ? 1 : 0), 0),
    ]),
  ) as Record<ProjectClassification['projectKind'], number>;

  const projectKind = (Object.entries(kindScores)
    .filter(([kind]) => kind !== 'unknown')
    .sort((left, right) => right[1] - left[1])[0] ?? ['unknown', 0]) as [
      ProjectClassification['projectKind'],
      number,
    ];
  const resolvedKind = projectKind[1] > 0 ? projectKind[0] : 'unknown';

  const evidence: ClassificationEvidence[] = [
    {
      label: 'Project shape',
      detail: resolvedKind === 'unknown' ? 'No framework-specific shape was assumed.' : `Signals match a ${resolvedKind}.`,
      weight: Math.min(projectKind[1] / 4, 1),
    },
    {
      label: 'Read-only analysis',
      detail: 'Repository text is only ever read as data; it never becomes code that runs.',
      weight: 1,
    },
    {
      label: 'ClawPump boundary',
      detail: 'Launching and trading always go through ClawPump’s own audited tools, never a generated program.',
      weight: 1,
    },
  ];

  const readableName = snapshot.repo.name.replace(/[-_]+/g, ' ');
  const shape = resolvedKind === 'unknown'
    ? 'a project with an unfamiliar shape'
    : `${article(resolvedKind)} ${resolvedKind.replace('-', ' ')}`;
  return {
    summary: `${titleCase(readableName)} appears to be ${shape}. Committ can draft a ClawPump token identity for it and hand off launch and trading to ClawPump.`,
    projectKind: resolvedKind,
    confidence: Math.min(0.62 + projectKind[1] * 0.06, 0.94),
    evidence,
  };
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

function article(kind: ProjectClassification['projectKind']): string {
  return kind === 'unknown' ? 'an' : 'a';
}
