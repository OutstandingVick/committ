import { CommittError } from '../agent/errors';

export type RpcFailureKind = 'unauthorized' | 'misconfigured' | 'unavailable';

/** Classify an RPC failure from its message without echoing it (it may contain the endpoint URL). */
export function classifyRpcFailure(error: unknown): RpcFailureKind {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/HTTP error \((?:401|403)\)/.test(message)) return 'unauthorized';
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo|Invalid URL|ERR_INVALID_URL/i.test(message)) return 'misconfigured';
  return 'unavailable';
}
