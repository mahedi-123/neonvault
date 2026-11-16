/**
 * Storefront ↔ backend client.
 *
 * Every design talks to the API through this one module. When no backend is
 * reachable (static preview, offline) `online` stays false and the contexts
 * fall back to browser-only behaviour, so the site still works as a demo.
 */
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || `Request failed (${status})`);
    this.status = status;
    this.fields = body?.details?.fields || {};
    this.problems = body?.details?.problems || [];
  }
}

export const backend = { online: false, checked: false };

export async function request(method, path, body, { signal, keepalive } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      credentials: 'include',
      signal,
      keepalive,
      headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), 'X-Requested-With': 'neonvault' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if (e?.name === 'AbortError') throw e;
    throw new ApiError(0, { error: 'Cannot reach the store right now. Check your connection and try again.' });
  }
  if (res.status === 204) return null;
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

export const api = {
  get: (p, o) => request('GET', p, undefined, o),
  post: (p, b, o) => request('POST', p, b ?? {}, o),
  put: (p, b, o) => request('PUT', p, b ?? {}, o),
  patch: (p, b, o) => request('PATCH', p, b ?? {}, o),
  del: (p, b, o) => request('DELETE', p, b, o),
};

/** Is there a backend? Resolves quickly either way (never blocks the page for long). */
let probe;
export function detectBackend(timeoutMs = 1500) {
  if (probe) return probe;
  probe = (async () => {
    if (import.meta.env.VITE_NO_BACKEND) return false;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await api.get('/health', { signal: ctrl.signal });
      return !!r?.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(t);
    }
  })().then((ok) => {
    backend.online = ok;
    backend.checked = true;
    return ok;
  });
  return probe;
}

/** Anonymous per-tab id for first-party analytics (no cookie, no personal data). */
const sid = (() => {
  try {
    let v = sessionStorage.getItem('nv-sid');
    if (!v) { v = Math.random().toString(36).slice(2, 12); sessionStorage.setItem('nv-sid', v); }
    return v;
  } catch { return 'nosession'; }
})();

export function track(type, extra = {}) {
  if (!backend.online) return;
  const body = { type, session: sid, template: document.documentElement.dataset.template, path: location.hash || location.pathname, ...extra };
  api.post('/analytics', body, { keepalive: true }).catch(() => {});
}

/** Error text for a form, plus per-field messages when the server sent them. */
export const errorText = (e) => (e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
