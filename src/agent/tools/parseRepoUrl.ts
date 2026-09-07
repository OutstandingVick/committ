import type { RepoReference } from '../../domain/committ';
import { CommittError } from '../errors';

const SEGMENT = /^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{0,98}[a-zA-Z0-9])?$/;

/** Accept a canonical public GitHub repository URL without following arbitrary hosts. */
export function parseRepoUrl(input: string): RepoReference {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new CommittError('INVALID_REPO_URL', 'Enter a complete GitHub repository URL.');
  }

  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com') {
    throw new CommittError(
      'UNSUPPORTED_REPO_HOST',
      'Phase one accepts public https://github.com repositories only.',
    );
  }
  if (url.username || url.password || url.port) {
    throw new CommittError('INVALID_REPO_URL', 'Repository URLs cannot include credentials or ports.');
  }

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length !== 2) {
    throw new CommittError(
      'INVALID_REPO_URL',
      'Use the repository root URL, for example https://github.com/owner/project.',
    );
  }

  const owner = parts[0];
  const name = parts[1].replace(/\.git$/i, '');
  if (!SEGMENT.test(owner) || !SEGMENT.test(name)) {
    throw new CommittError('INVALID_REPO_URL', 'That GitHub owner or repository name is not valid.');
  }

  return {
    owner,
    name,
    canonicalUrl: `https://github.com/${owner}/${name}`,
  };
}
