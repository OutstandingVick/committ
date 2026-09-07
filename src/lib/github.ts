import { CommittError } from '../agent/errors';
import type { RepoReference } from '../domain/committ';

interface GitHubRepoResponse {
  description: string | null;
  default_branch: string;
  stargazers_count: number;
  language: string | null;
  topics?: string[];
  private: boolean;
}

interface GitHubContentResponse {
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  encoding?: string;
  content?: string;
  size: number;
  path: string;
}

export class GitHubClient {
  private readonly baseUrl: string;
  private readonly token?: string;

  constructor(options: { baseUrl?: string; token?: string } = {}) {
    this.baseUrl = (options.baseUrl ?? process.env.COMMITT_GITHUB_API_URL ?? 'https://api.github.com').replace(/\/$/, '');
    this.token = options.token ?? process.env.GITHUB_TOKEN;
  }

  async getRepository(repo: RepoReference): Promise<GitHubRepoResponse> {
    const value = await this.request<GitHubRepoResponse>(`/repos/${repo.owner}/${repo.name}`);
    if (value.private) {
      throw new CommittError('PRIVATE_REPO', 'Phase one reads public repositories only.', 400);
    }
    return value;
  }

  async getTextFile(repo: RepoReference, path: string): Promise<string | null> {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    try {
      const value = await this.request<GitHubContentResponse>(
        `/repos/${repo.owner}/${repo.name}/contents/${encodedPath}`,
      );
      if (value.type !== 'file' || value.encoding !== 'base64' || !value.content) return null;
      return decodeBase64(value.content.replace(/\n/g, ''));
    } catch (error) {
      if (error instanceof CommittError && error.code === 'GITHUB_NOT_FOUND') return null;
      throw error;
    }
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'committ-dev-onboarding',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      signal: AbortSignal.timeout(8_000),
    });

    if (response.status === 404) {
      throw new CommittError('GITHUB_NOT_FOUND', 'That public GitHub repository was not found.', 404);
    }
    if (response.status === 403 || response.status === 429) {
      throw new CommittError('GITHUB_RATE_LIMITED', 'GitHub is busy. Please retry in a minute.', 429);
    }
    if (!response.ok) {
      throw new CommittError('GITHUB_UNAVAILABLE', 'GitHub could not be read right now.', 502);
    }
    return response.json() as Promise<T>;
  }
}

function decodeBase64(value: string): string {
  if (typeof Buffer !== 'undefined') return Buffer.from(value, 'base64').toString('utf8');
  const binary = atob(value);
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}
