'use client';

import { useEffect, useState } from 'react';
import { useWalletConnection } from '@solana/react-hooks';
import type { GithubSession, RepoListItem } from '../src/domain/committ';
import { getJson } from '../src/lib/apiClient';
import { GithubConnection } from './GithubConnection';
import { RepoAnalyzer } from './RepoAnalyzer';
import { WalletConnection } from './WalletConnection';

const PAGE_SIZE = 10;

/**
 * The agent-mode home screen: connect once, then just pick a repo. No form
 * to fill in per repo - the agent already read all of them the moment
 * GitHub connected.
 */
export function LaunchDashboard() {
  const wallet = useWalletConnection();
  const [session, setSession] = useState<GithubSession | null>(null);
  const [repos, setRepos] = useState<RepoListItem[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedRepoUrl, setSelectedRepoUrl] = useState<string | null>(null);

  // Reset the UI whenever the signed-in GitHub account changes. This runs
  // during render (React's documented pattern for "adjusting state when a
  // prop/value changes"), not inside an effect, so it never triggers a
  // synchronous setState-in-effect cascade.
  const [prevLogin, setPrevLogin] = useState<string | undefined>(session?.login);
  if (session?.login !== prevLogin) {
    setPrevLogin(session?.login);
    setQuery('');
    setPage(1);
    setSelectedRepoUrl(null);
    setRepos(null);
    setError('');
    setLoading(Boolean(session));
  }

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    getJson<{ repos: RepoListItem[] }>('/api/repos', 'Could not read your repositories.')
      .then((body) => {
        if (!cancelled) setRepos(body.repos);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not read your repositories.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const walletConnected = wallet.connected && Boolean(wallet.wallet);
  const ready = Boolean(session) && walletConnected;

  const filteredRepos = repos
    ? repos.filter((repo) => `${repo.owner}/${repo.name}`.toLowerCase().includes(query.trim().toLowerCase()))
    : null;
  const totalPages = filteredRepos ? Math.max(1, Math.ceil(filteredRepos.length / PAGE_SIZE)) : 1;
  const currentPage = Math.min(page, totalPages);
  const pageRepos = filteredRepos?.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE) ?? null;

  function updateQuery(value: string) {
    setQuery(value);
    setPage(1);
  }

  return (
    <section className="launch-dashboard" aria-labelledby="launch-title">
      <div className="review-copy">
        <span className="report-kicker">Agent mode</span>
        <h1 id="launch-title">Connect once. Pick a repo. The agent does the rest.</h1>
        <p>Committ reads every public repository you own as soon as GitHub is connected. Connect a wallet too, then launch straight from the table below.</p>
      </div>

      <div className="connect-row">
        <div>
          <span className="connect-label">1. GitHub</span>
          <GithubConnection onChange={setSession} />
        </div>
        <div>
          <span className="connect-label">2. Wallet</span>
          <WalletConnection />
        </div>
      </div>

      {selectedRepoUrl ? (
        <div className="launch-flow">
          <button type="button" className="back-link" onClick={() => setSelectedRepoUrl(null)}>
            ← Back to repositories
          </button>
          <RepoAnalyzer repoUrl={selectedRepoUrl} key={selectedRepoUrl} />
        </div>
      ) : !session ? (
        <p className="form-message">Connect GitHub to see your repositories here.</p>
      ) : loading ? (
        <p className="form-message">Reading your repositories…</p>
      ) : error ? (
        <p className="form-message form-error" role="alert">{error}</p>
      ) : repos && repos.length === 0 ? (
        <p className="form-message">No public repositories found on this account yet.</p>
      ) : repos && pageRepos ? (
        <>
          <input
            type="search"
            className="repo-search"
            placeholder="Search your repos by name…"
            aria-label="Search repositories by name"
            value={query}
            onChange={(event) => updateQuery(event.target.value)}
          />

          {pageRepos.length === 0 ? (
            <p className="form-message">No repositories match “{query}”.</p>
          ) : (
            <div className="repo-table" role="table" aria-label="Your repositories">
              <div className="repo-table-head" role="row">
                <span role="columnheader">Repository</span>
                <span role="columnheader">Language</span>
                <span role="columnheader">Stars</span>
                <span role="columnheader" aria-hidden="true" />
              </div>
              {pageRepos.map((repo) => (
                <div className="repo-row" role="row" key={repo.canonicalUrl}>
                  <div role="cell">
                    <strong>{repo.owner}/{repo.name}</strong>
                    <p>{repo.description ?? 'No description.'}</p>
                  </div>
                  <span role="cell">{repo.primaryLanguage ?? '—'}</span>
                  <span role="cell">{repo.stars}</span>
                  <span role="cell">
                    <button
                      type="button"
                      className={ready ? 'repo-launch' : 'repo-launch repo-launch-disabled'}
                      disabled={!ready}
                      onClick={() => setSelectedRepoUrl(repo.canonicalUrl)}
                    >
                      Launch →
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="repo-pagination">
              <button type="button" onClick={() => setPage(currentPage - 1)} disabled={currentPage <= 1}>
                ← Prev
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button type="button" onClick={() => setPage(currentPage + 1)} disabled={currentPage >= totalPages}>
                Next →
              </button>
            </div>
          ) : null}

          {!ready ? <p className="form-message">Connect a wallet to turn on Launch.</p> : null}
        </>
      ) : null}
    </section>
  );
}
