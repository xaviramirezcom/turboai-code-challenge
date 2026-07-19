/** The single base HTTP client. Every slice's api/ wraps this — components
never call fetch directly (enforced by ESLint in ui/). */

import { API_BASE_URL } from '@/shared/config';

import { getAuthToken } from './authToken';
import { NGROK_SKIP_WARNING_HEADER } from './ngrokHeader';

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(status: number, data: unknown) {
    super(`API error ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

interface RequestOptions {
  body?: unknown;
  /** Attach the Authorization header when a token is present (default true). */
  auth?: boolean;
  /** Extra request headers (e.g. X-Session-Id for the advisory lock). */
  headers?: Record<string, string>;
  /** Let the request outlive the page (fetch keepalive) — used to release the
   * note lock on tab close/pagehide. */
  keepalive?: boolean;
}

async function request<T>(
  method: Method,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, auth = true, headers: extra, keepalive } = options;
  const headers: Record<string, string> = {
    ...NGROK_SKIP_WARNING_HEADER,
    ...extra,
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = getAuthToken();
  if (auth && token) headers['Authorization'] = `Token ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    keepalive,
  });

  const payload =
    response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, payload);
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, { ...options, body }),
  del: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, options),
};
