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

const TIP_SIGNALS = [
  /creator/i,
  /open.source/i,
  /community/i,
  /donat/i,
  /support/i,
  /content/i,
  /discord/i,
  /telegram/i,
];

/** Classify bounded text as data. It cannot select code outside the audited registry. */
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
  const tipMatches = TIP_SIGNALS.filter((pattern) => pattern.test(corpus)).length;

  const evidence: ClassificationEvidence[] = [
    {
      label: 'Project shape',
      detail: resolvedKind === 'unknown' ? 'No framework-specific shape was assumed.' : `Signals match a ${resolvedKind}.`,
      weight: Math.min(projectKind[1] / 4, 1),
    },
    {
      label: 'Low-risk utility',
      detail: 'A tip jar adds an optional on-chain action without moving existing application state.',
      weight: 1,
    },
    {
      label: 'Audited boundary',
      detail: 'The recommendation maps to a fixed template; repository text cannot become Rust code.',
      weight: 1,
    },
  ];

  const readableName = snapshot.repo.name.replace(/[-_]+/g, ' ');
  const shape = resolvedKind === 'unknown'
    ? 'a project with an unfamiliar shape'
    : `${article(resolvedKind)} ${resolvedKind.replace('-', ' ')}`;
  return {
    summary: `${titleCase(readableName)} appears to be ${shape}. Committ recommends an optional SOL tip jar as the smallest safe on-chain addition.`,
    projectKind: resolvedKind,
    recommendedTemplate: 'tip-jar',
    confidence: Math.min(0.62 + projectKind[1] * 0.06 + tipMatches * 0.025, 0.94),
    evidence,
  };
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

function article(kind: ProjectClassification['projectKind']): string {
  return kind === 'unknown' ? 'an' : 'a';
}
