import { randomUUID } from 'node:crypto';
import type { AgentLog, AnalysisResult, ProjectClassification, RepoSnapshot } from '../domain/committ';
import { prepareClawPumpLaunch } from '../lib/clawpump';
import { classifyProject } from './tools/classifyProject';
import { parseRepoUrl } from './tools/parseRepoUrl';
import { readRepo } from './tools/readRepo';

interface AnalyzeDependencies {
  readRepo?: (repo: ReturnType<typeof parseRepoUrl>) => Promise<RepoSnapshot>;
  classifyProject?: (snapshot: RepoSnapshot) => ProjectClassification;
  id?: () => string;
  clock?: () => number;
}

/**
 * The single source of truth for repository analysis, independent of the web
 * UI. There is no template registry and no devnet preparation step here -
 * the chain reads the repo, classifies it in plain language, and drafts a
 * ClawPump token identity for it. Launching and trading are handled entirely
 * by ClawPump's own tools (see ../lib/clawpump.ts), never by code generated
 * here.
 */
export async function analyzeRepository(
  repoUrl: string,
  dependencies: AnalyzeDependencies = {},
): Promise<AnalysisResult> {
  const clock = dependencies.clock ?? Date.now;
  const startedAt = clock();
  const logs: AgentLog[] = [];
  const log = (step: AgentLog['step'], message: string) => {
    logs.push({ step, status: 'complete', message, elapsedMs: Math.max(0, clock() - startedAt) });
  };

  const repo = parseRepoUrl(repoUrl);
  log('validate', `Validated ${repo.owner}/${repo.name} as a public GitHub repository URL.`);

  const snapshot = await (dependencies.readRepo ?? readRepo)(repo);
  log(
    'read',
    `Read ${snapshot.files.length} allowlisted text files without cloning or running repository code.`,
  );

  const classification = (dependencies.classifyProject ?? classifyProject)(snapshot);
  log('classify', `Classified the repository as ${classification.projectKind}.`);

  const tokenLaunch = prepareClawPumpLaunch(repo);
  log('plan', `Drafted a ClawPump token identity: ${tokenLaunch.name} ($${tokenLaunch.ticker}).`);
  logs.push({
    step: 'report',
    status: 'waiting',
    message: 'Waiting for the developer to review and confirm the launch.',
    elapsedMs: Math.max(0, clock() - startedAt),
  });

  return {
    analysisId: (dependencies.id ?? randomUUID)(),
    snapshot,
    classification,
    tokenLaunch,
    logs,
    requiresConfirmation: true,
  };
}
