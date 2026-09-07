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
  return new CommittError(
    'INTERNAL_ERROR',
    'Committ could not finish this step. Nothing was deployed or charged.',
    500,
  );
}
