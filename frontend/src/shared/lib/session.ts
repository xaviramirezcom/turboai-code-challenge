/** Stable per-tab editing-session id (used for the advisory note lock, 5.x).
 * Persisted to sessionStorage so a reload keeps the same session, but a second
 * tab gets its own id and thus contends for the lock. */
const KEY = 'turbo.session-id';
let cached: string | null = null;

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `sess-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export function getSessionId(): string {
  if (cached) return cached;
  if (typeof window !== 'undefined') {
    const stored = window.sessionStorage.getItem(KEY);
    if (stored) {
      cached = stored;
      return stored;
    }
    const id = uuid();
    window.sessionStorage.setItem(KEY, id);
    cached = id;
    return id;
  }
  cached = uuid();
  return cached;
}
