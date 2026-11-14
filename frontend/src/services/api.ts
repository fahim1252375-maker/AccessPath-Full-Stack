import { useAppStore } from '../store/useAppStore.ts';

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : undefined;
}

/** Requests that take longer than this are aborted so a weak campus connection never hangs the UI. */
const DEFAULT_TIMEOUT_MS = 20_000;

export interface ApiRequestOptions extends RequestInit {
  /** Return the response body as text instead of unwrapping the JSON envelope. */
  raw?: boolean;
  /** Abort the request after this many milliseconds (default 20 000). */
  timeoutMs?: number;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { raw, timeoutMs = DEFAULT_TIMEOUT_MS, signal: callerSignal, ...init } = options;
  const token = useAppStore.getState().token;
  const csrf = getCookie('accesspath_csrf');
  const headers = new Headers(init.headers || {});

  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('X-Requested-With', 'AccessPath');
  if (csrf) headers.set('X-CSRF-Token', csrf);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  // One controller serves both the timeout and any cancellation requested by the caller.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (callerSignal?.aborted) controller.abort();
  else callerSignal?.addEventListener('abort', () => controller.abort(), { once: true });

  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });
  } catch (error) {
    if (callerSignal?.aborted) throw error; // the caller cancelled on purpose
    if (controller.signal.aborted) {
      throw new ApiError('The request timed out. Check your connection and try again.', 0);
    }
    throw new ApiError('Network error. Check your connection and try again.', 0);
  } finally {
    clearTimeout(timer);
  }

  if (raw) {
    if (!response.ok) throw new ApiError('Request failed', response.status);
    return (await response.text()) as unknown as T;
  }

  const json = await response.json().catch(() => ({
    success: false,
    error: `HTTP ${response.status}`,
  }));

  if (!response.ok || json.success === false) {
    throw new ApiError(json.error || 'Request failed', response.status, json.details);
  }

  return json.data as T;
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'POST',
      body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
};
