import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import { ClawPumpToolError } from './mcpClient.js';
import {
  addToWhitelist,
  createAgent,
  getAgent,
  getBalance,
  getLaunchStatus,
  getPortfolio,
  launchToken,
  syncBilling,
  transferFromAgent,
} from './clawpumpTools.js';

const app = express();
app.use(express.json({ limit: '256kb' }));

function requireSharedSecret(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.BRIDGE_SHARED_SECRET;
  if (!expected) {
    console.error('[bridge] BRIDGE_SHARED_SECRET is not set; refusing all requests.');
    res.status(500).json({ error: { code: 'BRIDGE_MISCONFIGURED', message: 'The bridge is not configured.' } });
    return;
  }
  const header = req.header('authorization') ?? '';
  const provided = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  if (provided !== expected) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid bridge credentials.' } });
    return;
  }
  next();
}

function asyncRoute(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    handler(req, res).catch((error) => sendError(res, error));
  };
}

function sendError(res: Response, error: unknown) {
  console.error('[bridge] request failed:', error);
  if (error instanceof ClawPumpToolError) {
    res.status(502).json({ error: { code: 'CLAWPUMP_TOOL_ERROR', message: error.message, tool: error.toolName } });
    return;
  }
  const message = error instanceof Error ? error.message : 'The bridge could not complete this request.';
  res.status(502).json({ error: { code: 'BRIDGE_ERROR', message } });
}

// Health check is intentionally unauthenticated so hosting platforms
// (Render/Railway/Fly.io) can probe it without credentials.
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'committ-bridge' });
});

app.use(requireSharedSecret);

// Create a fresh, private ClawPump agent (= a wallet) for one repository's
// token. One agent per launched repo keeps funds and history separated.
app.post('/agents', asyncRoute(async (req, res) => {
  const { name, description, imageUrl } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'name is required.' } });
    return;
  }
  const agent = await createAgent({ name, description, imageUrl });
  console.log(`[bridge] created ClawPump agent ${agent.agentId} (wallet ${agent.walletAddress}) for "${name}"`);
  res.status(201).json(agent);
}));

app.get('/agents/:agentId', asyncRoute(async (req, res) => {
  const agent = await getAgent(req.params.agentId);
  res.json(agent);
}));

// Launches a real token on pump.fun via ClawPump. Irreversible, costs real
// SOL from the agent's wallet. Committ's API route must only call this after
// a fresh, explicit human confirmation - this endpoint trusts its caller on
// that and only refuses to proceed if confirmLaunch !== true.
app.post('/agents/:agentId/launch', asyncRoute(async (req, res) => {
  const { name, symbol, description, imageUrl, twitterUrl, websiteUrl, firstBuySol, confirmLaunch } = req.body ?? {};
  if (confirmLaunch !== true) {
    res.status(400).json({ error: { code: 'CONFIRMATION_REQUIRED', message: 'confirmLaunch must be true to launch a token.' } });
    return;
  }
  if (typeof name !== 'string' || typeof symbol !== 'string' || typeof description !== 'string') {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'name, symbol, and description are required.' } });
    return;
  }
  if (firstBuySol !== undefined && (typeof firstBuySol !== 'number' || firstBuySol < 0 || firstBuySol > 85)) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'firstBuySol must be a number between 0 and 85.' } });
    return;
  }

  const result = await launchToken({
    agentId: req.params.agentId,
    name,
    symbol,
    description,
    imageUrl,
    twitterUrl,
    websiteUrl,
    firstBuySol,
  });
  console.log(`[bridge] launched token "${symbol}" via agent ${req.params.agentId} -> mint ${result.mintAddress ?? 'pending'}`);
  res.status(201).json(result);
}));

app.get('/launches/:launchId/status', asyncRoute(async (req, res) => {
  const status = await getLaunchStatus(req.params.launchId);
  res.json(status);
}));

app.get('/agents/:agentId/portfolio', asyncRoute(async (req, res) => {
  const portfolio = await getPortfolio(req.params.agentId);
  res.json(portfolio);
}));

// ClawPump's own service-credit balance, separate from the agent's SOL
// wallet above. "Payment required" errors from ClawPump (create_agent,
// launch, etc.) mean this is empty, not the wallet.
app.get('/agents/:agentId/balance', asyncRoute(async (req, res) => {
  const balance = await getBalance(req.params.agentId);
  res.json(balance);
}));

// Call after a top-up so an on-chain deposit gets credited, then report the
// resulting balance in one round trip.
app.post('/billing/sync', asyncRoute(async (req, res) => {
  await syncBilling();
  const agentId = typeof req.body?.agentId === 'string' ? req.body.agentId : undefined;
  const balance = await getBalance(agentId);
  res.json(balance);
}));

// Leave a small SOL buffer in the agent wallet so it stays rent-exempt and
// can cover its own network fees. Everything else - SOL above the reserve,
// plus any other token the agent holds (including the repo's own launched
// token) - goes out in full.
const SOL_WITHDRAW_RESERVE = 0.003;

// Sends everything in an agent's wallet straight to the caller-supplied
// destination. No separate approval step here by design: the destination is
// the repository owner's own already-connected wallet, supplied by Committ's
// web app, not a third party - this only ever returns funds to their owner.
app.post('/agents/:agentId/withdraw', asyncRoute(async (req, res) => {
  const { destination } = req.body ?? {};
  if (typeof destination !== 'string' || destination.trim().length < 32) {
    res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'A valid destination wallet address is required.' } });
    return;
  }

  const agentId = req.params.agentId;
  const portfolio = await getPortfolio(agentId);

  try {
    await addToWhitelist(agentId, destination, 'owner-wallet');
  } catch (error) {
    // If the address is already whitelisted (or this call has some other
    // transient issue), don't block the withdraw attempt below - a genuine
    // whitelist problem will surface clearly from wallet_transfer itself.
    console.warn('[bridge] add_to_whitelist before withdraw did not succeed cleanly:', error);
  }

  const transfers: Array<{ token: string; amount: number; ok: boolean; error?: string }> = [];

  for (const position of portfolio.positions) {
    const isSol = position.symbol === 'SOL';
    const amount = isSol ? position.amount - SOL_WITHDRAW_RESERVE : position.amount;
    if (amount <= 0) continue;

    try {
      await transferFromAgent(agentId, destination, amount, isSol ? 'SOL' : position.mint);
      transfers.push({ token: position.symbol, amount, ok: true });
    } catch (error) {
      transfers.push({
        token: position.symbol,
        amount,
        ok: false,
        error: error instanceof Error ? error.message : 'Transfer failed.',
      });
    }
  }

  console.log(`[bridge] withdrew from agent ${agentId} to ${destination}:`, transfers);
  res.json({ transfers, reserveKeptSol: SOL_WITHDRAW_RESERVE });
}));

app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No such route.' } });
});

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`[bridge] committ-bridge listening on :${port}`);
});
