export class CommittError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = 'CommittError';
  }
}

export function publicError(error: unknown): CommittError {
  if (error instanceof CommittError) return error;
  if (error instanceof Error && /HTTP error \((?:403|429|5\d\d)\)/.test(error.message)) {
    return new CommittError(
      'DEVNET_RPC_UNAVAILABLE',
      'The Solana devnet RPC is temporarily unavailable. Try again shortly.',
      503,
    );
  }
  return new CommittError(
    'INTERNAL_ERROR',
    'Committ could not finish this step. Nothing was deployed or charged.',
    500,
  );
}
