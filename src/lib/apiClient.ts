import type { ApiErrorBody } from '../domain/committ';

/**
 * Every client component in this app fetches one of Committ's own API
 * routes and does the same thing with the reply: parse JSON, check for
 * `{ error }`, throw a plain Error otherwise. These two helpers are that
 * logic written once, so components only describe the call, not the
 * plumbing around it.
 */

export async function getJson<T>(url: string, fallbackMessage: string): Promise<T> {
  return parseJsonResponse<T>(await fetch(url), fallbackMessage);
}

export async function postJson<T>(url: string, body: unknown, fallbackMessage: string): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJsonResponse<T>(response, fallbackMessage);
}

/** Same as postJson, but for a multipart body (file uploads) - no Content-Type header, the browser sets the boundary itself. */
export async function postForm<T>(url: string, body: FormData, fallbackMessage: string): Promise<T> {
  const response = await fetch(url, { method: 'POST', body });
  return parseJsonResponse<T>(response, fallbackMessage);
}

async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const body = (await response.json().catch(() => null)) as (T | ApiErrorBody | null);
  if (!response.ok || !body || (typeof body === 'object' && 'error' in body)) {
    throw new Error(body && typeof body === 'object' && 'error' in body ? body.error.message : fallbackMessage);
  }
  return body;
}
