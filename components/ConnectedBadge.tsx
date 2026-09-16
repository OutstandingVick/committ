/** The small "connected" pill used by both WalletConnection and GithubConnection. */
export function ConnectedBadge({ label, onDisconnect }: { label: string; onDisconnect: () => void }) {
  return (
    <div className="wallet-connected">
      <span><i />{label}</span>
      <button type="button" onClick={onDisconnect}>Disconnect</button>
    </div>
  );
}
