'use client';

import { FormEvent, useState } from 'react';
import type { AnalysisResult, ApiErrorBody } from '../src/domain/committ';
import { AnalysisReport } from './AnalysisReport';
import { DeploymentReview } from './DeploymentReview';

export function RepoAnalyzer() {
  const [repoUrl, setRepoUrl] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const normalized = repoUrl.startsWith('http') ? repoUrl : `https://github.com/${repoUrl}`;
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: normalized }),
      });
      const body = await response.json() as AnalysisResult | ApiErrorBody;
      if (!response.ok || 'error' in body) {
        throw new Error('error' in body ? body.error.message : 'Analysis failed.');
      }
      setResult(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Committ could not analyze this repository.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="analyzer-shell">
      <form className="repo-form" aria-label="Analyze a GitHub repository" onSubmit={submit}>
        <label htmlFor="repo-url">Public GitHub repository</label>
        <div className="repo-input-row">
          <span className="github-prefix" aria-hidden="true">github.com/</span>
          <input
            id="repo-url"
            name="repoUrl"
            type="text"
            placeholder="owner/project"
            autoComplete="url"
            value={repoUrl}
            onChange={(event) => setRepoUrl(event.target.value)}
            required
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Reading safely…' : 'Analyze repo'} <span aria-hidden="true">→</span>
          </button>
        </div>
        <p>Read-only. No cloning. No repository code is ever run.</p>
      </form>
      {error ? <p className="form-message form-error" role="alert">{error}</p> : null}
      {result ? <><AnalysisReport result={result} /><DeploymentReview analysis={result} /></> : null}
    </div>
  );
}
