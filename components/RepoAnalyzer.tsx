'use client';

import { useEffect, useState } from 'react';
import type { AnalysisResult } from '../src/domain/committ';
import { postJson } from '../src/lib/apiClient';
import { AnalysisReport } from './AnalysisReport';
import { DeploymentReview } from './DeploymentReview';

/**
 * Runs the agent's read → classify → recommend chain for one repository the
 * user already picked in /launch's table. There is no manual URL entry here
 * any more - the repo is always chosen by clicking Launch, never pasted.
 *
 * The parent always renders this with `key={repoUrl}` (see LaunchDashboard),
 * so a new repo selection remounts a fresh instance rather than reusing this
 * one - the initial state below is already correct for the very first
 * render, and the effect only needs to kick off the fetch.
 */
export function RepoAnalyzer({ repoUrl }: { repoUrl: string }) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    postJson<AnalysisResult>('/api/analyze', { repoUrl }, 'Analysis failed.')
      .then((body) => {
        if (!cancelled) setResult(body);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Committ could not analyze this repository.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [repoUrl]);

  return (
    <div className="analyzer-shell">
      {loading ? <p className="form-message">Reading {repoUrl}, read-only, nothing is cloned or run…</p> : null}
      {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
      {result ? <><AnalysisReport result={result} /><DeploymentReview analysis={result} /></> : null}
    </div>
  );
}
