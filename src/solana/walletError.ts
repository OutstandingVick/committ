/** Keep extension errors out of the page while giving the user a useful next step. */
export function walletConnectionMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/reject|declin|denied|cancel|user closed/i.test(message)) {
    return 'Connection was declined. Approve the request in your wallet to try again.';
  }
  if (/locked|unlock/i.test(message)) {
    return 'Unlock your wallet extension, then try connecting again.';
  }
  if (/already pending|already processing|request.*pending/i.test(message)) {
    return 'A wallet request is already open. Check the wallet popup before trying again.';
  }
  return 'The wallet could not connect. Open your wallet extension, check for a pending request, and try again.';
}
