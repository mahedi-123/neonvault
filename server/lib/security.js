import { HttpError } from './http.js';

/** Conservative security headers for both the API and the built site. */
export function securityHeaders({ isProd }) {
  return (req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'Cross-Origin-Opener-Policy': 'same-origin',
    });
    if (isProd) res.set('Strict-Transport-Security', 'max-age=15552000');
    if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store');
    next();
  };
}

/**
 * CSRF guard: every state-changing API call must carry X-Requested-With.
 * Browsers can't add a custom header cross-site without a CORS preflight
 * (which this API never grants), and the session cookie is SameSite=Lax.
 */
export function csrfGuard(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-requested-with') === 'neonvault') return next();
  next(new HttpError(403, 'Missing request header.'));
}

/**
 * Fixed-window in-memory rate limiter keyed by IP (+ optional key fn).
 * Fine for one Node process; put a shared store in front for clusters.
 */
export function rateLimit({ windowMs, max, key = () => '', message = 'Too many requests — slow down a little.' }) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, windowMs);
  timer.unref?.();
  return (req, res, next) => {
    const k = `${req.ip}|${key(req)}`;
    const now = Date.now();
    let e = hits.get(k);
    if (!e || e.reset <= now) { e = { n: 0, reset: now + windowMs }; hits.set(k, e); }
    e.n++;
    res.set('RateLimit-Remaining', String(Math.max(0, max - e.n)));
    if (e.n > max) {
      res.set('Retry-After', String(Math.ceil((e.reset - now) / 1000)));
      return next(new HttpError(429, message));
    }
    next();
  };
}

/**
 * Per-email login lockout (on top of the IP limit). Every attempt is counted
 * *before* the slow password check, so a burst of parallel guesses can't all
 * slip past the limit; a successful login clears the count.
 */
export function loginGuard({ maxFails = 5, lockMs = 15 * 60e3 } = {}) {
  const state = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of state) if (v.until < now && v.last + lockMs < now) state.delete(k);
  }, 60e3);
  timer.unref?.();
  const locked = (f) => {
    const mins = Math.max(1, Math.ceil((f.until - Date.now()) / 60e3));
    return new HttpError(429, `Too many failed attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''}.`);
  };
  return {
    /** Call before verifying. Throws 429 while locked or when too many attempts are in flight. */
    attempt(email) {
      const now = Date.now();
      const f = state.get(email) || { n: 0, until: 0, last: now };
      if (f.until > now) throw locked(f);
      if (f.n >= maxFails) { f.until = now + lockMs; f.n = 0; state.set(email, f); throw locked(f); }
      f.n++;
      f.last = now;
      state.set(email, f);
    },
    fail(email) {
      const f = state.get(email);
      if (f && f.n >= maxFails) { f.until = Date.now() + lockMs; f.n = 0; }
    },
    ok(email) { state.delete(email); },
  };
}
