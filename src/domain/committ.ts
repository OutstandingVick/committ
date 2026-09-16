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
  confidence: number;
  evidence: ClassificationEvidence[];
}

export interface AgentLog {
  step: 'validate' | 'read' | 'classify' | 'plan' | 'report';
  status: 'complete' | 'waiting' | 'blocked';
  message: string;
  elapsedMs: number;
}

/**
 * The result of the agent's full read chain for one repository. Everything
 * needed to show a ClawPump launch plan travels in `tokenLaunch` - there is
 * no separate "deployment plan" step or object any more.
 */
export interface AnalysisResult {
  analysisId: string;
  snapshot: RepoSnapshot;
  classification: ProjectClassification;
  tokenLaunch: TokenLaunchPlan;
  logs: AgentLog[];
  requiresConfirmation: true;
}

export type TokenLaunchStatus =
  | 'unavailable'
  | 'draft'
  | 'agent-created'
  | 'launching'
  | 'launched'
  | 'failed';

export interface TokenLaunchPlan {
  provider: 'ClawPump';
  status: TokenLaunchStatus;
  name: string;
  ticker: string;
  agentId: string | null;
  walletAddress: string | null;
  mintAddress: string | null;
  explorerUrl: string | null;
  safeguards: string[];
}

export interface LaunchAgentResult {
  agentId: string;
  walletAddress: string;
}

export interface LaunchExecutionResult {
  status: 'launched';
  mintAddress: string | null;
  explorerUrl: string | null;
}

export interface PortfolioPosition {
  mint: string;
  symbol: string;
  amount: number;
  valueUsd: number | null;
  pnlUsd: number | null;
  pnlPercent: number | null;
}

export interface AgentPortfolio {
  totalValueUsd: number | null;
  totalPnlUsd: number | null;
  totalPnlPercent: number | null;
  positions: PortfolioPosition[];
}

export interface WithdrawTransfer {
  token: string;
  amount: number;
  ok: boolean;
  error?: string;
}

export interface WithdrawResult {
  transfers: WithdrawTransfer[];
  reserveKeptSol: number;
}

/** ClawPump's own service-credit balance - separate from the agent wallet's SOL/token holdings above. */
export interface BillingBalance {
  balanceUsd: number | null;
}

export interface GithubSession {
  login: string;
  name: string | null;
  avatarUrl: string;
}

export interface RepoListItem {
  owner: string;
  name: string;
  canonicalUrl: string;
  description: string | null;
  primaryLanguage: string | null;
  stars: number;
  updatedAt: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
