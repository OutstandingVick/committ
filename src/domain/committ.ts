export type SolanaCluster = 'devnet';

export type TemplateId = 'tip-jar';

export interface RepoReference {
  owner: string;
  name: string;
  canonicalUrl: string;
}

export interface RepoFile {
  path: string;
  content: string;
  byteLength: number;
}

export interface RepoSnapshot {
  repo: RepoReference;
  description: string | null;
  defaultBranch: string;
  stars: number;
  primaryLanguage: string | null;
  topics: string[];
  files: RepoFile[];
  fetchedAt: string;
  truncated: boolean;
}

export interface ClassificationEvidence {
  label: string;
  detail: string;
  weight: number;
}

export interface ProjectClassification {
  summary: string;
  projectKind: 'web-app' | 'bot' | 'cli' | 'library' | 'unknown';
  recommendedTemplate: TemplateId;
  confidence: number;
  evidence: ClassificationEvidence[];
}

export interface AgentLog {
  step: 'validate' | 'read' | 'classify' | 'recommend' | 'prepare' | 'report';
  status: 'complete' | 'waiting' | 'blocked';
  message: string;
  elapsedMs: number;
}

export interface AnalysisResult {
  analysisId: string;
  snapshot: RepoSnapshot;
  classification: ProjectClassification;
  logs: AgentLog[];
  requiresConfirmation: true;
}

export interface DeploymentPlan {
  analysisId: string;
  cluster: SolanaCluster;
  template: TemplateId;
  repository: string;
  programId: string | null;
  authority: string | null;
  status: 'dry-run' | 'ready-for-wallet';
  explorerUrl: string | null;
  blinkUrl: string;
  checks: string[];
  tokenLaunch: TokenLaunchPlan;
}

export interface TokenLaunchPlan {
  provider: 'ClawPump';
  status: 'requires-separate-confirmation';
  name: string;
  ticker: string;
  package: string;
  safeguards: string[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
