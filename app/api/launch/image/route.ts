import { CommittError, publicError } from '../../../../src/agent/errors';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 15_000;

/**
 * ClawPump's launch tool takes a token image as a URL - it fetches the image
 * itself, it never accepts raw file bytes. So a file picked on the user's own
 * machine has to become a public URL before it can be used. This route does
 * that by re-hosting the file on a free, keyless public file host. Committ
 * itself keeps no copy of the file.
 *
 * Two hosts are tried in order, because a single free host can be
 * unreachable on some networks (corporate proxies, some ISPs) - if the first
 * one fails outright, the second is tried before giving up.
 */
const IMAGE_HOSTS = [
  async (file: File): Promise<string> => {
    const body = new FormData();
    body.set('reqtype', 'fileupload');
    body.set('fileToUpload', file, file.name || 'token-image');
    const response = await fetchWithTimeout('https://catbox.moe/user/api.php', {
      method: 'POST',
      body,
      headers: { 'User-Agent': 'committ-app/1.0 (+https://github.com)' },
    });
    const text = (await response.text().catch(() => '')).trim();
    if (!response.ok || !text.startsWith('http')) throw new Error('catbox rejected the upload');
    return text;
  },
  async (file: File): Promise<string> => {
    const body = new FormData();
    body.set('file', file, file.name || 'token-image');
    const response = await fetchWithTimeout('https://0x0.st', {
      method: 'POST',
      body,
      headers: { 'User-Agent': 'committ-app/1.0 (+https://github.com)' },
    });
    const text = (await response.text().catch(() => '')).trim();
    if (!response.ok || !text.startsWith('http')) throw new Error('0x0.st rejected the upload');
    return text;
  },
];

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      throw new CommittError('INVALID_INPUT', 'Choose an image file to upload.');
    }
    if (!file.type.startsWith('image/')) {
      throw new CommittError('INVALID_INPUT', 'The token image must be an image file.');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new CommittError('INVALID_INPUT', 'Keep the token image under 5MB.');
    }

    let lastError: unknown;
    for (const upload of IMAGE_HOSTS) {
      try {
        const imageUrl = await upload(file);
        return Response.json({ imageUrl });
      } catch (cause) {
        lastError = cause;
      }
    }
    console.error('[launch/image] every image host failed:', lastError);
    throw new CommittError(
      'IMAGE_HOST_UNREACHABLE',
      'Could not reach an image host from here. Paste a direct image URL instead, or try again shortly.',
      502,
    );
  } catch (error) {
    const safe = publicError(error);
    return Response.json({ error: { code: safe.code, message: safe.message } }, { status: safe.status });
  }
}
