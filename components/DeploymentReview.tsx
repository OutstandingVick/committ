'use client';

import { FormEvent, useState } from 'react';
import type { AnalysisResult, ApiErrorBody, DeploymentPlan } from '../src/domain/committ';

export function DeploymentReview({ analysis }: { analysis: AnalysisResult }) {
  const [authority, setAuthority] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [plan, setPlan] = useState<DeploymentPlan | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: analysis.analysisId,
          repoUrl: analysis.snapshot.repo.canonicalUrl,
          template: analysis.classification.recommendedTemplate,
          authority,
          confirmed,
        }),
      });
      const body = await response.json() as DeploymentPlan | ApiErrorBody;
      if (!response.ok || 'error' in body) throw new Error('error' in body ? body.error.message : 'Preparation failed.');
      setPlan(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The plan could not be prepared.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="deployment-review" aria-labelledby="review-title">
      <div className="review-copy">
        <span className="report-kicker">Human checkpoint</span>
        <h3 id="review-title">Review before anything touches chain.</h3>
        <p>This prepares a devnet plan only. It does not sign, spend, or launch a token.</p>
      </div>
      <form onSubmit={prepare}>
        <label htmlFor="authority">Authority wallet <span>optional for dry run</span></label>
        <input id="authority" value={authority} onChange={(event) => setAuthority(event.target.value)} placeholder="Solana address" />
        <label className="confirmation-row">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
          <span>I reviewed the SOL tip-jar template and confirm devnet preparation.</span>
        </label>
        <button type="submit" disabled={!confirmed || loading}>{loading ? 'Preparing…' : 'Prepare devnet plan →'}</button>
        {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
      </form>

      {plan ? (
        <div className="deployment-plan" aria-live="polite">
          <div><span>Status</span><strong>{plan.status === 'dry-run' ? 'Dry run ready' : 'Ready for wallet'}</strong></div>
          <div><span>Cluster</span><strong>{plan.cluster}</strong></div>
          <div><span>Program</span><strong>{plan.programId ?? 'Awaiting deployment'}</strong></div>
          <ul>{plan.checks.map((check) => <li key={check}>✓ {check}</li>)}</ul>
          {plan.explorerUrl ? <a href={plan.explorerUrl} target="_blank" rel="noreferrer">Open Solana Explorer ↗</a> : null}
        </div>
      ) : null}
    </section>
  );
}
