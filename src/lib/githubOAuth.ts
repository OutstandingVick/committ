import { CommittError } from '../agent/errors';
import type { GithubSession, RepoListItem } from '../domain/committ';
import { githubAuthErrorForStatus } from './github';

/**
 * GitHub OAuth (for "connect your GitHub account") plus the one read call
 * that follows it: listing the repos the agent can read. This is separate
 * from src/lib/github.ts, which reads a single repository's contents once a
 * user has already picked one - this file is about who the user is and
 * which repos they own.
 */

const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const API_BASE = (process.env.COMMITT_GITHUB_API_URL ?? 'https://api.github.com').replace(/\/$/, '');

function clientId(): string {
  const value = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!value) throw new CommittError('GITHUB_OAUTH_NOT_CONFIGURED', 'GitHub sign-in is not configured on this deployment yet.', 503);
  return value;
}

function clientSecret(): string {
  const value = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!value) throw new CommittError('GITHUB_OAUTH_NOT_CONFIGURED', 'GitHub sign-in is not configured on this deployment yet.', 503);
  return value;
}

export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', clientId());
  url.searchParams.set('redirect_uri', redirectUri);
  // read:user only - just enough to say who the user is. Phase one only ever
  // reads PUBLIC repositories, so no repo scope is requested at all.
  url.searchParams.set('scope', 'read:user');
  url.searchParams.set('state', state);
  url.searchParams.set('allow_signup', 'false');
  return url.toString();
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string> {
  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId(), client_secret: clientSecret(), code, redirect_uri: redirectUri }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new CommittError('GITHUB_OAUTH_FAILED', 'Could not reach GitHub to finish sign-in.', 502);
  }
  const body = await response.json().catch(() => null) as { access_token?: string; error_description?: string } | null;
  if (!response.ok || !body?.access_token) {
    throw new CommittError('GITHUB_OAUTH_FAILED', body?.error_description ?? 'GitHub sign-in did not complete.', 502);
  }
  return body.access_token;
}

interface GithubUserResponse {
  login: string;
  name: string | null;
  avatar_url: string;
}

export async function fetchGithubUser(accessToken: string): Promise<GithubSession> {
  const user = await githubRequest<GithubUserResponse>(accessToken, '/user');
  return { login: user.login, name: user.name, avatarUrl: user.avatar_url };
}

interface GithubRepoListEntry {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
  owner: { login: string };
}

/** Lists the user's own public, non-fork repositories - the only kind Committ can read. */
export async function listPublicRepos(accessToken: string, login: string): Promise<RepoListItem[]> {
  const repos = await githubRequest<GithubRepoListEntry[]>(
    accessToken,
    `/users/${encodeURIComponent(login)}/repos?type=owner&sort=updated&per_page=100`,
  );
  return repos
    .filter((repo) => !repo.private && !repo.fork && !repo.archived)
    .map((repo) => ({
      owner: repo.owner.login,
      name: repo.name,
      canonicalUrl: repo.html_url,
      description: repo.description,
      primaryLanguage: repo.language,
      stars: repo.stargazers_count,
      updatedAt: repo.updated_at,
    }));
}

async function githubRequest<T>(accessToken: string, path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'committ-dev-onboarding',
      },
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new CommittError('GITHUB_UNAVAILABLE', 'GitHub could not be reached right now.', 502);
  }
  const mapped = githubAuthErrorForStatus(response.status);
  if (mapped) throw mapped;
  if (!response.ok) throw new CommittError('GITHUB_UNAVAILABLE', 'GitHub could not be reached right now.', 502);
  return response.json() as Promise<T>;
}
