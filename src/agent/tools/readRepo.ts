import type { RepoFile, RepoReference, RepoSnapshot } from '../../domain/committ';
import { GitHubClient } from '../../lib/github';

export const REPO_READ_PATHS = [
  'README.md',
  'README.rst',
  'README.txt',
  'package.json',
  'pyproject.toml',
  'requirements.txt',
  'Pipfile',
  'go.mod',
  'Cargo.toml',
  'Dockerfile',
  'src/index.ts',
  'src/index.js',
  'app.py',
  'main.py',
] as const;

export const MAX_FILE_BYTES = 24_000;
export const MAX_TOTAL_BYTES = 96_000;

interface RepoReader {
  getRepository(repo: RepoReference): Promise<{
    description: string | null;
    default_branch: string;
    stargazers_count: number;
    language: string | null;
    topics?: string[];
  }>;
  getTextFile(repo: RepoReference, path: string): Promise<string | null>;
}

/** Read a fixed, small set of text files. Repository content is never executed. */
export async function readRepo(
  repo: RepoReference,
  options: { client?: RepoReader; now?: () => Date } = {},
): Promise<RepoSnapshot> {
  const client = options.client ?? new GitHubClient();
  const metadata = await client.getRepository(repo);
  const settled = await Promise.all(
    REPO_READ_PATHS.map(async (path) => ({ path, content: await client.getTextFile(repo, path) })),
  );

  const files: RepoFile[] = [];
  let totalBytes = 0;
  let truncated = false;

  for (const candidate of settled) {
    if (candidate.content === null) continue;
    const sourceBytes = new TextEncoder().encode(candidate.content).byteLength;
    const available = Math.min(MAX_FILE_BYTES, MAX_TOTAL_BYTES - totalBytes);
    if (available <= 0) {
      truncated = true;
      break;
    }
    const content = truncateUtf8(candidate.content, available);
    const byteLength = new TextEncoder().encode(content).byteLength;
    truncated ||= byteLength < sourceBytes;
    files.push({ path: candidate.path, content, byteLength });
    totalBytes += byteLength;
  }

  return {
    repo,
    description: metadata.description,
    defaultBranch: metadata.default_branch,
    stars: metadata.stargazers_count,
    primaryLanguage: metadata.language,
    topics: metadata.topics ?? [],
    files,
    fetchedAt: (options.now ?? (() => new Date()))().toISOString(),
    truncated,
  };
}

function truncateUtf8(value: string, maxBytes: number): string {
  const bytes = new TextEncoder().encode(value);
  if (bytes.byteLength <= maxBytes) return value;
  return new TextDecoder().decode(bytes.slice(0, maxBytes));
}
