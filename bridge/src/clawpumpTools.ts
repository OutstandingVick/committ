import { callClawPumpTool } from './mcpClient.js';

/**
 * Thin, typed wrappers around the exact ClawPump MCP tools Committ needs.
 * Nothing here decides product logic (that stays in the Committ web app) -
 * this file only knows how to call ClawPump and shape its replies.
 */

export interface CreateAgentInput {
  name: string;
  description?: string;
  imageUrl?: string;
}

export interface CreateAgentResult {
  agentId: string;
  walletAddress: string;
  raw: unknown;
}

/** The handful of shapes ClawPump has been observed to return for an agent. */
interface AgentPayload {
  agent?: { id?: string; wallet?: string };
  id?: string;
  agent_id?: string;
  wallet?: string;
  wallet_address?: string;
  walletAddress?: string;
}

export async function createAgent(input: CreateAgentInput): Promise<CreateAgentResult> {
  const raw = await callClawPumpTool<AgentPayload>('create_agent', {
    name: input.name,
    description: input.description,
    image_url: input.imageUrl,
    // Deliberately omitted: is_public. Committ-created agents stay private;
    // making one public requires a separately connected external wallet
    // (ClawPump returns "Access denied" otherwise), which is out of scope here.
  });

  const agentId = raw?.agent?.id ?? raw?.id ?? raw?.agent_id;
  const walletAddress = raw?.agent?.wallet ?? raw?.wallet ?? raw?.wallet_address ?? raw?.walletAddress;

  if (!agentId || !walletAddress) {
    throw new Error('ClawPump create_agent did not return an agent id and wallet address.');
  }

  return { agentId, walletAddress, raw };
}

export interface AgentSummary {
  agentId: string;
  walletAddress: string | null;
  raw: unknown;
}

export async function getAgent(agentId: string): Promise<AgentSummary> {
  const raw = await callClawPumpTool<AgentPayload>('get_agent', { agent_id: agentId });
  const walletAddress = raw?.agent?.wallet ?? raw?.wallet ?? raw?.wallet_address ?? raw?.walletAddress ?? null;
  return { agentId, walletAddress, raw };
}

export interface LaunchTokenInput {
  agentId: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl?: string;
  twitterUrl?: string;
  websiteUrl?: string;
  /** SOL to spend on an optional first buy at launch (ClawPump supports up to 85 SOL). */
  firstBuySol?: number;
}

export interface LaunchTokenResult {
  launchId: string | null;
  mintAddress: string | null;
  explorerUrl: string | null;
  raw: unknown;
}

/** The handful of shapes ClawPump has been observed to return for a launch. */
interface LaunchPayload {
  launch_id?: string;
  launchId?: string;
  id?: string;
  mint?: string;
  mint_address?: string;
  mintAddress?: string;
  explorer_url?: string;
  explorerUrl?: string;
}

/**
 * Calls ClawPump's recommended paid launch tool. `launch_token_gasless` is
 * documented by ClawPump as legacy ("use the paid launch flow"), so this
 * bridge only ever calls `launch_metaplex_genesis_token`.
 *
 * This is irreversible and costs real SOL from the agent's wallet. The
 * caller (Committ's API route) is responsible for having already collected
 * an explicit, freshly-given human confirmation before this is invoked -
 * this function performs no confirmation of its own.
 */
export async function launchToken(input: LaunchTokenInput): Promise<LaunchTokenResult> {
  const raw = await callClawPumpTool<LaunchPayload>('launch_metaplex_genesis_token', {
    agent_id: input.agentId,
    name: input.name,
    symbol: input.symbol,
    description: input.description,
    image_url: input.imageUrl,
    twitter: input.twitterUrl,
    website: input.websiteUrl,
    first_buy_sol: input.firstBuySol,
    confirm_launch: true,
  });

  const launchId = raw?.launch_id ?? raw?.launchId ?? raw?.id ?? null;
  const mintAddress = raw?.mint ?? raw?.mint_address ?? raw?.mintAddress ?? null;
  const explorerUrl = raw?.explorer_url ?? raw?.explorerUrl
    ?? (mintAddress ? `https://solscan.io/token/${mintAddress}` : null);

  return { launchId, mintAddress, explorerUrl, raw };
}

export interface LaunchStatusResult {
  status: string;
  raw: unknown;
}

interface LaunchStatusPayload {
  status?: string;
}

export async function getLaunchStatus(launchId: string): Promise<LaunchStatusResult> {
  const raw = await callClawPumpTool<LaunchStatusPayload>('get_launch_status', { launch_id: launchId });
  const status = raw?.status ?? 'unknown';
  return { status, raw };
}

/** Registers a wallet address the agent is allowed to send funds to. */
export async function addToWhitelist(agentId: string, address: string, label?: string): Promise<void> {
  await callClawPumpTool<unknown>('add_to_whitelist', { agent_id: agentId, address, label });
}

export interface PortfolioPosition {
  mint: string;
  symbol: string;
  amount: number;
  valueUsd: number | null;
  pnlUsd: number | null;
  pnlPercent: number | null;
}

export interface Portfolio {
  totalValueUsd: number | null;
  totalPnlUsd: number | null;
  totalPnlPercent: number | null;
  positions: PortfolioPosition[];
}

/**
 * ClawPump's own get_portfolio response shape isn't documented anywhere
 * Committ could confirm ahead of time. These interfaces try every plausible
 * field-naming convention (snake_case and camelCase, a few likely array and
 * SOL-balance shapes) and fall back to null/empty rather than throwing. If
 * real output doesn't match, tighten these against an actual response.
 */
interface PortfolioRawPosition {
  mint?: string;
  address?: string;
  token_mint?: string;
  tokenMint?: string;
  symbol?: string;
  ticker?: string;
  token_symbol?: string;
  ui_amount?: number | string;
  uiAmount?: number | string;
  amount?: number | string;
  balance?: number | string;
  value_usd?: number | string;
  valueUsd?: number | string;
  usd_value?: number | string;
  usdValue?: number | string;
  pnl_usd?: number | string;
  pnlUsd?: number | string;
  unrealized_pnl?: number | string;
  pnl?: number | string;
  pnl_percent?: number | string;
  pnlPercent?: number | string;
  pnl_pct?: number | string;
  pnlPct?: number | string;
}

interface PortfolioRawPayload {
  positions?: PortfolioRawPosition[];
  holdings?: PortfolioRawPosition[];
  tokens?: PortfolioRawPosition[];
  balances?: PortfolioRawPosition[];
  sol?: number | string;
  sol_balance?: number | string;
  solBalance?: number | string;
  total_value_usd?: number | string;
  totalValueUsd?: number | string;
  portfolio_value_usd?: number | string;
  total_pnl_usd?: number | string;
  totalPnlUsd?: number | string;
  pnl_usd?: number | string;
  total_pnl_percent?: number | string;
  totalPnlPercent?: number | string;
  pnl_percent?: number | string;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export async function getPortfolio(agentId: string): Promise<Portfolio> {
  const raw = await callClawPumpTool<PortfolioRawPayload>('get_portfolio', { agent_id: agentId });

  const rawPositions = raw?.positions ?? raw?.holdings ?? raw?.tokens ?? raw?.balances ?? [];
  const positions: PortfolioPosition[] = rawPositions.map((item) => ({
    mint: item.mint ?? item.address ?? item.token_mint ?? item.tokenMint ?? 'unknown',
    symbol: (item.symbol ?? item.ticker ?? item.token_symbol ?? 'UNKNOWN').toUpperCase(),
    amount: toNumber(item.ui_amount ?? item.uiAmount ?? item.amount ?? item.balance) ?? 0,
    valueUsd: toNumber(item.value_usd ?? item.valueUsd ?? item.usd_value ?? item.usdValue),
    pnlUsd: toNumber(item.pnl_usd ?? item.pnlUsd ?? item.unrealized_pnl ?? item.pnl),
    pnlPercent: toNumber(item.pnl_percent ?? item.pnlPercent ?? item.pnl_pct ?? item.pnlPct),
  }));

  // A native SOL balance is sometimes returned as its own top-level field
  // rather than inside the positions array - fold it in if it's missing.
  const solFromTop = toNumber(raw?.sol ?? raw?.sol_balance ?? raw?.solBalance);
  if (solFromTop !== null && !positions.some((position) => position.symbol === 'SOL')) {
    positions.unshift({ mint: 'SOL', symbol: 'SOL', amount: solFromTop, valueUsd: null, pnlUsd: null, pnlPercent: null });
  }

  return {
    totalValueUsd: toNumber(raw?.total_value_usd ?? raw?.totalValueUsd ?? raw?.portfolio_value_usd),
    totalPnlUsd: toNumber(raw?.total_pnl_usd ?? raw?.totalPnlUsd ?? raw?.pnl_usd),
    totalPnlPercent: toNumber(raw?.total_pnl_percent ?? raw?.totalPnlPercent ?? raw?.pnl_percent),
    positions,
  };
}

export interface BillingBalance {
  balanceUsd: number | null;
  raw: unknown;
}

interface BalanceRawPayload {
  balance_usd?: number | string;
  balanceUsd?: number | string;
  credits?: number | string;
  credit_balance?: number | string;
  creditBalance?: number | string;
  balance?: number | string;
}

/**
 * ClawPump's own service-credit balance (used to pay for agent actions like
 * creating an agent or launching a token). This is separate from the agent
 * wallet's SOL/token holdings in getPortfolio - "Payment required" errors
 * from ClawPump point here, not at the wallet.
 */
export async function getBalance(agentId?: string): Promise<BillingBalance> {
  const raw = await callClawPumpTool<BalanceRawPayload>('get_balance', agentId ? { agent_id: agentId } : {});
  const balanceUsd = toNumber(
    raw?.balance_usd ?? raw?.balanceUsd ?? raw?.credits ?? raw?.credit_balance ?? raw?.creditBalance ?? raw?.balance,
  );
  return { balanceUsd, raw };
}

/** Applies a fresh on-chain top-up to the credit balance above; ClawPump docs say to call this after depositing. */
export async function syncBilling(): Promise<unknown> {
  return callClawPumpTool<unknown>('sync_billing', {});
}

/** Sends an amount already held in the agent's own wallet to a whitelisted address. */
export async function transferFromAgent(
  agentId: string,
  to: string,
  amount: number,
  token = 'SOL',
): Promise<void> {
  await callClawPumpTool<unknown>('wallet_transfer', {
    agent_id: agentId,
    to,
    amount,
    token,
    confirm_transfer: true,
  });
}
