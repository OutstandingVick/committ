'use client';

import { useSolTransfer, useWalletConnection } from '@solana/react-hooks';
import { useEffect, useRef, useState } from 'react';
import type { AnalysisResult, LaunchAgentResult, LaunchExecutionResult } from '../src/domain/committ';
import { postForm, postJson } from '../src/lib/apiClient';
import { solToLamports } from '../src/lib/sol';
import { AgentWalletPanel } from './AgentWalletPanel';

export function DeploymentReview({ analysis }: { analysis: AnalysisResult }) {
  const { tokenLaunch } = analysis;
  const wallet = useWalletConnection();
  const transfer = useSolTransfer();

  const [launchAgent, setLaunchAgent] = useState<LaunchAgentResult | null>(null);
  const [fundAmount, setFundAmount] = useState('0.05');
  const [fundError, setFundError] = useState('');
  const [firstBuySol, setFirstBuySol] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [launchConfirmed, setLaunchConfirmed] = useState(false);
  const [launchResult, setLaunchResult] = useState<LaunchExecutionResult | null>(null);
  const [launchError, setLaunchError] = useState('');
  const [launchStage, setLaunchStage] = useState<'idle' | 'creating' | 'launching'>('idle');
  const walletRequested = useRef(false);

  async function createWallet() {
    setLaunchStage('creating');
    setLaunchError('');
    try {
      const agent = await postJson<LaunchAgentResult>(
        '/api/launch/agent',
        { repoUrl: analysis.snapshot.repo.canonicalUrl, name: tokenLaunch.name },
        'Could not create a launch wallet.',
      );
      setLaunchAgent(agent);
    } catch (cause) {
      setLaunchError(cause instanceof Error ? cause.message : 'Could not create a launch wallet.');
    } finally {
      setLaunchStage('idle');
    }
  }

  useEffect(() => {
    if (walletRequested.current) return;
    if (tokenLaunch.status === 'unavailable') return;
    walletRequested.current = true;
    void createWallet();
    // Create the launch wallet once, automatically, as soon as this repo's
    // plan is ready - createWallet is stable enough for this component's
    // lifetime, and the ref above already stops a second call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenLaunch.status]);

  async function uploadImage(file: File) {
    setImageError('');
    setImageUploading(true);
    try {
      const form = new FormData();
      form.set('file', file);
      const { imageUrl: hostedUrl } = await postForm<{ imageUrl: string }>(
        '/api/launch/image',
        form,
        'Could not upload that image.',
      );
      setImageUrl(hostedUrl);
    } catch (cause) {
      setImageError(cause instanceof Error ? cause.message : 'Could not upload that image.');
    } finally {
      setImageUploading(false);
    }
  }

  function fundFromWallet() {
    setFundError('');
    if (!launchAgent) return;
    let lamports: bigint;
    try {
      lamports = solToLamports(fundAmount);
    } catch (cause) {
      setFundError(cause instanceof Error ? cause.message : 'Enter a valid SOL amount.');
      return;
    }
    if (lamports <= 0n) {
      setFundError('Enter an amount greater than 0.');
      return;
    }
    void transfer.send({ destination: launchAgent.walletAddress, amount: lamports });
  }

  async function launchToken() {
    if (!launchAgent) return;

    let firstBuy: number | undefined;
    if (firstBuySol.trim()) {
      const parsed = Number(firstBuySol.trim());
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 85) {
        setLaunchError('First buy must be a number between 0 and 85.');
        return;
      }
      firstBuy = parsed;
    }

    setLaunchStage('launching');
    setLaunchError('');
    try {
      const result = await postJson<LaunchExecutionResult>(
        '/api/launch/execute',
        {
          agentId: launchAgent.agentId,
          name: tokenLaunch.name,
          ticker: tokenLaunch.ticker,
          description: `ClawPump token for ${analysis.snapshot.repo.canonicalUrl}, created with Committ.`,
          imageUrl: imageUrl.trim() || undefined,
          firstBuySol: firstBuy,
          confirmLaunch: true,
        },
        'The launch did not complete.',
      );
      setLaunchResult(result);
    } catch (cause) {
      setLaunchError(cause instanceof Error ? cause.message : 'The launch did not complete.');
    } finally {
      setLaunchStage('idle');
    }
  }

  return (
    <section className="deployment-review" aria-labelledby="review-title">
      <div className="review-copy">
        <span className="report-kicker">Human checkpoint</span>
        <h3 id="review-title">Review before anything touches chain.</h3>
        <p>Committ creates the launch wallet for you. You just fund it, add a token image, and give a final, explicit confirmation before anything is spent.</p>
      </div>

      <div className="token-plan" aria-live="polite">
        <span>ClawPump token launch</span>
        <strong>{tokenLaunch.name} · ${tokenLaunch.ticker}</strong>

        {tokenLaunch.status === 'unavailable' ? (
          <p>Real token launches are not configured on this deployment yet.</p>
        ) : launchResult ? (
          <div className="launch-done">
            <p>Launched. {launchResult.mintAddress ? <code>{launchResult.mintAddress}</code> : 'Awaiting mint confirmation from ClawPump.'}</p>
            {launchResult.explorerUrl ? <a href={launchResult.explorerUrl} target="_blank" rel="noreferrer">View token ↗</a> : null}
          </div>
        ) : launchAgent ? (
          <div className="launch-fund">
            <p>Fund this wallet, then confirm below. This spends real mainnet SOL and cannot be undone.</p>
            <code>{launchAgent.walletAddress}</code>

            <div className="fund-row">
              <input
                type="text"
                inputMode="decimal"
                value={fundAmount}
                onChange={(event) => setFundAmount(event.target.value)}
                aria-label="Amount of SOL to send"
                placeholder="0.05"
              />
              <button
                type="button"
                onClick={fundFromWallet}
                disabled={!wallet.connected || transfer.isSending}
              >
                {transfer.isSending ? 'Sending…' : 'Fund from wallet →'}
              </button>
            </div>
            {!wallet.connected ? <p className="fund-alt">Connect a wallet above to fund with one click.</p> : null}
            {transfer.signature ? (
              <p>Sent. <a href={`https://solscan.io/tx/${transfer.signature}`} target="_blank" rel="noreferrer">View transaction ↗</a></p>
            ) : null}
            {transfer.error ? <p className="form-message form-error" role="alert">{String(transfer.error)}</p> : null}
            {fundError ? <p className="form-message form-error" role="alert">{fundError}</p> : null}
            <p className="fund-alt">Or send SOL to this address yourself from any wallet or exchange.</p>

            <label className="first-buy-row">
              First buy at launch (optional, SOL, up to 85)
              <input
                type="text"
                inputMode="decimal"
                value={firstBuySol}
                onChange={(event) => setFirstBuySol(event.target.value)}
                placeholder="0"
              />
            </label>

            <div className="token-image-field">
              <label className="token-image-upload-button" aria-label="Upload token image">
                <input
                  type="file"
                  accept="image/*"
                  disabled={imageUploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) void uploadImage(file);
                  }}
                />
                {imageUploading ? (
                  <span className="token-image-plus">…</span>
                ) : imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="" className="token-image-thumb" />
                ) : (
                  <span className="token-image-plus">+</span>
                )}
              </label>
              <div className="token-image-meta">
                <span>Token image (required)</span>
                {imageUploading ? <span className="fund-alt">Uploading…</span> : null}
                {imageUrl && !imageUploading ? (
                  <a href={imageUrl} target="_blank" rel="noreferrer">View image ↗</a>
                ) : null}
              </div>
            </div>
            {imageError ? (
              <>
                <p className="form-message form-error" role="alert">{imageError}</p>
                <label className="first-buy-row token-image-url-row">
                  Or paste a direct image URL
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    placeholder="https://…"
                  />
                </label>
              </>
            ) : null}

            <label className="confirmation-row">
              <input type="checkbox" checked={launchConfirmed} onChange={(event) => setLaunchConfirmed(event.target.checked)} />
              <span>I funded this wallet and understand launching is irreversible.</span>
            </label>
            <button
              type="button"
              onClick={launchToken}
              disabled={!launchConfirmed || !imageUrl.trim() || imageUploading || launchStage === 'launching'}
            >
              {launchStage === 'launching' ? 'Launching…' : 'Launch token now →'}
            </button>
          </div>
        ) : (
          <div className="launch-start">
            <p>{launchError ? 'Could not create a launch wallet.' : 'Creating wallet…'}</p>
            {launchError ? (
              <button
                type="button"
                onClick={() => {
                  setLaunchError('');
                  void createWallet();
                }}
                disabled={launchStage === 'creating'}
              >
                {launchStage === 'creating' ? 'Creating wallet…' : 'Retry →'}
              </button>
            ) : null}
          </div>
        )}
        {launchError ? <p className="form-message form-error" role="alert">{launchError}</p> : null}
        {launchAgent ? (
          <AgentWalletPanel agentId={launchAgent.agentId} agentWalletAddress={launchAgent.walletAddress} />
        ) : null}
      </div>
    </section>
  );
}
