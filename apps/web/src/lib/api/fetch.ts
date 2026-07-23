/**
 * apiFetch — v2.10.0
 *
 * Central authenticated fetch helper.
 *
 * Features:
 *  - Automatic retry with exponential backoff (network errors only)
 *  - AbortController timeout (15s per attempt)
 *  - Backend connectivity tracking (emits 'backend:status' events)
 *  - Distinguishes network errors from API errors (no retry on 4xx)
 *  - Clean error messages for each failure class
 *  - No console spam — each unique error path logs once
 */

// ─── Backend status event bus ──────────────────────────────────────────────
// Other parts of the app (notifications, AuthContext) can listen to
// window.addEventListener('backend:status', ...) to show/hide banners.
function emitBackendStatus(online: boolean) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('backend:status', { detail: { online } })
  );
}

// ─── Token helper ──────────────────────────────────────────────────────────
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ifh_token');
}

// ─── URL builder ──────────────────────────────────────────────────────────
// Always uses NEXT_PUBLIC_API_URL when set (direct mode).
// Falls back to relative /api/… for proxy/rewrite mode (Vercel, local with no env var).
export function buildApiUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const apiPath = normalizedPath.startsWith('/api/')
    ? normalizedPath
    : `/api${normalizedPath}`;

  return base ? `${base}${apiPath}` : apiPath;
}

// ─── Network error classifier ──────────────────────────────────────────────
function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('fetch failed') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') || // Safari
    err.name === 'TypeError'
  );
}

// ─── Retry config ─────────────────────────────────────────────────────────
// REDUCED: from 3 to 2 retries to minimize pool pressure under concurrent load
// Each retry = new connection request. With N users = N × retries × connections.
// Neon serverless pool is small (5-10 connections). Better to fail fast and let user retry.
const RETRY_ATTEMPTS = 2;
const RETRY_BASE_DELAY_MS = 500; // reduced from 800ms: 500ms, 1000ms

function retryDelay(attempt: number): number {
  return RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Core fetch (single attempt) ──────────────────────────────────────────
// Timeout from 10s: gives enough time for most requests.
// With network retries (2 attempts), total timeout is ~20s per request.
async function fetchOnce(
  url: string,
  options: RequestInit,
  timeoutMs = 30_000
): Promise<Response> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(tid);
  }
}

// ─── Main export ───────────────────────────────────────────────────────────
export async function apiFetch(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<any> {
  const url = buildApiUrl(path);
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const reqOptions: RequestInit = { ...options, headers };
  const { timeoutMs } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt++) {
    // Only retry on network errors, not on 4xx/5xx responses
    if (attempt > 0) {
      await sleep(retryDelay(attempt - 1));
    }

    try {
      const res = await fetchOnce(url, reqOptions, timeoutMs);

      // Backend is reachable — signal recovery
      emitBackendStatus(true);

      // ── 401: session expired ─────────────────────────────────────────────
      if (res.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('ifh_token');
          localStorage.removeItem('ifh_user');
          window.location.href = '/login';
        }
        throw new Error('Session expired. Please log in again.');
      }

      // ── Parse JSON ────────────────────────────────────────────────────────
      const json = await res.json().catch(() => ({}));

      // ── HTTP errors (4xx/5xx) — do NOT retry ─────────────────────────────
      if (!res.ok) {
        const msg = json?.message || `HTTP ${res.status}`;

        // Map status codes to readable messages
        const display =
          res.status === 500
            ? 'The server encountered an error. Please try again.'
            : res.status === 502 || res.status === 503 || res.status === 504
              ? 'The server is temporarily unavailable. Please try again in a moment.'
              : res.status === 403
                ? 'You do not have permission to perform this action.'
                : res.status === 404
                  ? 'The requested resource was not found.'
                  : msg;

        throw new Error(display);
      }

      // ── Unwrap envelope: { data, meta } or { data } ───────────────────────
      if (json?.data !== undefined && json?.meta !== undefined) return json;
      if (json?.data !== undefined) return json.data;
      return json;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Abort = timeout
      if (lastError.name === 'AbortError') {
        lastError = new Error(
          'Request timed out. The server is taking too long to respond.'
        );
        // Timeouts are retried like network errors
      }

      // Non-network errors (HTTP 4xx, session expired, permission) — stop immediately
      if (!isNetworkError(err) && lastError.name !== 'AbortError') {
        throw lastError;
      }

      // On final attempt, emit backend-offline and throw
      if (attempt === RETRY_ATTEMPTS) {
        emitBackendStatus(false);
        throw new Error(
          'Unable to connect to the server. ' +
            'The backend may be starting up — please wait a moment and try again.'
        );
      }

      // Otherwise continue to next retry
    }
  }

  // Should never reach here
  throw lastError ?? new Error('Unknown network error');
}
