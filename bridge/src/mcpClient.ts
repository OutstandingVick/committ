import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * Owns the single, long-lived connection to the ClawPump MCP server.
 *
 * ClawPump ships `@clawpump/agents` as a local stdio MCP server: the docs at
 * https://clawpump.tech/docs confirm it is launched with `npx @clawpump/agents`
 * and reads `CLAWPUMP_API_KEY` from its environment, forwarding it to the
 * ClawPump API as a Bearer token. Cloudflare Workers cannot spawn or keep
 * that subprocess alive, which is the entire reason this bridge exists: this
 * process spawns it once, keeps it warm, and respawns it if it ever dies.
 */

let clientPromise: Promise<Client> | null = null;

function requireApiKey(): string {
  const key = process.env.CLAWPUMP_API_KEY;
  if (!key || !key.startsWith('cpk_')) {
    throw new Error('CLAWPUMP_API_KEY is missing or does not look like a ClawPump key (expected a cpk_... value).');
  }
  return key;
}

async function connect(): Promise<Client> {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@clawpump/agents'],
    env: { ...processEnvForChild(), CLAWPUMP_API_KEY: requireApiKey() },
  });

  const client = new Client({ name: 'committ-bridge', version: '0.1.0' }, { capabilities: {} });

  transport.onclose = () => {
    console.error('[bridge] ClawPump MCP subprocess closed; will respawn on next request.');
    clientPromise = null;
  };
  transport.onerror = (error) => {
    console.error('[bridge] ClawPump MCP transport error:', error);
  };

  await client.connect(transport);
  console.log('[bridge] connected to ClawPump MCP server (@clawpump/agents).');
  return client;
}

/** Node's process.env has string | undefined values; the SDK wants string-only. */
function processEnvForChild(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string') out[key] = value;
  }
  return out;
}

/** Returns the shared MCP client, connecting (or reconnecting) as needed. */
export async function getClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = connect().catch((error) => {
      clientPromise = null;
      throw error;
    });
  }
  return clientPromise;
}

export class ClawPumpToolError extends Error {
  constructor(public readonly toolName: string, message: string) {
    super(message);
    this.name = 'ClawPumpToolError';
  }
}

/**
 * Calls one ClawPump MCP tool and returns its parsed JSON result.
 * ClawPump's tools return their payload as a text content block; this
 * unwraps that and parses it, falling back to the raw text if it is not JSON.
 */
export async function callClawPumpTool<T = unknown>(toolName: string, args: Record<string, unknown>): Promise<T> {
  const client = await getClient();
  const result = await client.callTool({ name: toolName, arguments: args });

  if (result.isError) {
    const message = extractText(result.content) || `ClawPump tool "${toolName}" reported an error.`;
    throw new ClawPumpToolError(toolName, message);
  }

  const text = extractText(result.content);
  if (text === null) return result as unknown as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

function extractText(content: unknown): string | null {
  if (!Array.isArray(content)) return null;
  const textBlock = content.find((block): block is { type: 'text'; text: string } => (
    typeof block === 'object' && block !== null && (block as { type?: unknown }).type === 'text'
  ));
  return textBlock ? textBlock.text : null;
}
