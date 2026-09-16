import type {
  AgentPortfolio,
  BillingBalance,
  LaunchAgentResult,
  LaunchExecutionResult,
  RepoReference,
  TokenLaunchPlan,
  WithdrawResult,
} from '../domain/committ';
import { CommittError } from '../agent/errors';

/**
 * ClawPump ships its tools as a local stdio MCP server, not a REST API, so
 * this Cloudflare Worker cannot call ClawPump directly - Workers cannot spawn
 * or keep a subprocess alive. `committ-bridge` (a small always-on Node
 * service, see /bridge in this repo) hosts that MCP connection and exposes a
 * minimal HTTP API instead. Everything in this file talks to that bridge,
 * never to ClawPump itself.
 */

function bridgeConfig(): { url: string; secret: string } | null {
  const url = process.env.COMMITT_BRIDGE_URL?.trim();
  const secret = process.env.COMMITT_BRIDGE_SHARED_SECRET?.trim();
  if (!url || !secret) return null;
  return { url: url.replace(/\/+$/, ''), secret };
}

async function bridgeRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const config = bridgeConfig();
  if (!config) {
    throw new CommittError(
      'LAUNCH_BRIDGE_NOT_CONFIGURED',
      'Real token launches are not configured on this deployment yet.',
      503,
    );
  }

  let response: Response;
  try {
    response = await fetch(`${config.url}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.secret}`,
        ...init.headers,
      },
    });
  } catch {
    throw new CommittError('LAUNCH_BRIDGE_UNREACHABLE', 'Could not reach the token-launch service. Try again shortly.', 502);
  }

  const body = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } | T | null;
  if (!response.ok) {
    const message = (body as { error?: { message?: string } } | null)?.error?.message
      ?? 'The token-launch service could not complete this step.';
    throw new CommittError('LAUNCH_BRIDGE_ERROR', message, 502);
  }
  return body as T;
}

/** Describe the token launch boundary without invoking an irreversible CLI command. */
export function prepareClawPumpLaunch(repo: RepoReference): TokenLaunchPlan {
  const name = humanize(repo.name).slice(0, 80);
  const ticker = repo.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10) || 'COMMIT';
  return {
    provider: 'ClawPump',
    status: bridgeConfig() ? 'draft' : 'unavailable',
    name,
    ticker,
    agentId: null,
    walletAddress: null,
    mintAddress: null,
    explorerUrl: null,
    safeguards: [
      'The launch command is never run during repository analysis.',
      'Creating a wallet does not launch a token by itself.',
      'A second explicit confirmation is required before launch, because launch is irreversible.',
      'The repository owner funds the launch wallet; ClawPump custodies it, not Committ.',
      'The repository owner can withdraw everything in the launch wallet to their own wallet at any time.',
      'Post-launch reinvestment is disabled by default.',
      'Committ stores no ClawPump credential; only the bridge service holds one.',
    ],
  };
}

/**
 * Step 1 of a real launch: create a dedicated, private ClawPump agent
 * (= a fresh Solana wallet) for this one repository. Costs nothing by
 * itself; the caller must still fund the returned wallet before launching.
 */
export async function createLaunchAgent(repo: RepoReference, name: string): Promise<LaunchAgentResult> {
  return bridgeRequest<LaunchAgentResult>('/agents', {
    method: 'POST',
    body: JSON.stringify({
      name: `committ-${repo.owner}-${repo.name}`.slice(0, 64),
      description: `Committ launch wallet for ${repo.canonicalUrl}, drafted as "${name}".`,
    }),
  });
}

export interface ExecuteLaunchInput {
  agentId: string;
  name: string;
  ticker: string;
  description: string;
  imageUrl?: string;
  /** SOL to spend on an optional first buy at launch. ClawPump allows 0-85. */
  firstBuySol?: number;
}

/**
 * Step 2 of a real launch: spend real SOL from the agent's wallet to launch
 * a token on pump.fun via ClawPump. Irreversible. Must only be called after
 * a human has given fresh, explicit confirmation in this request - Committ
 * never calls this on a schedule or automatically.
 */
export async function executeLaunch(input: ExecuteLaunchInput): Promise<LaunchExecutionResult> {
  const result = await bridgeRequest<{ mintAddress: string | null; explorerUrl: string | null }>(
    `/agents/${encodeURIComponent(input.agentId)}/launch`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        symbol: input.ticker,
        description: input.description,
        imageUrl: input.imageUrl,
        firstBuySol: input.firstBuySol,
        confirmLaunch: true,
      }),
    },
  );
  return { status: 'launched', mintAddress: result.mintAddress, explorerUrl: result.explorerUrl };
}

function humanize(value: string): string {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

/** Current holdings and P&L for one agent's wallet. */
export async function getAgentPortfolio(agentId: string): Promise<AgentPortfolio> {
  return bridgeRequest<AgentPortfolio>(`/agents/${encodeURIComponent(agentId)}/portfolio`);
}

/**
 * Sends everything in the agent's wallet to `destination` in one call - no
 * separate on-chain approval step, since the destination is always the
 * caller's own already-connected wallet, never a third party.
 */
export async function withdrawAgentFunds(agentId: string, destination: string): Promise<WithdrawResult> {
  return bridgeRequest<WithdrawResult>(`/agents/${encodeURIComponent(agentId)}/withdraw`, {
    method: 'POST',
    body: JSON.stringify({ destination }),
  });
}

/** ClawPump's own credit balance for this agent - what "Payment required" errors are about. */
export async function getClawPumpBalance(agentId: string): Promise<BillingBalance> {
  return bridgeRequest<BillingBalance>(`/agents/${encodeURIComponent(agentId)}/balance`);
}

/** Re-checks on-chain deposits and applies them to the credit balance above. Call this after a top-up. */
export async function syncClawPumpBilling(agentId: string): Promise<BillingBalance> {
  return bridgeRequest<BillingBalance>('/billing/sync', {
    method: 'POST',
    body: JSON.stringify({ agentId }),
  });
}
