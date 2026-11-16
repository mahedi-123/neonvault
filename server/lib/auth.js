import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { unauthorized, forbidden } from './http.js';

const scrypt = promisify(crypto.scrypt);
const KEYLEN = 64;
const PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export const COOKIE = 'nv_sid';

/** scrypt with a per-password salt; stored as scrypt$N$r$p$salt$hash. */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password.normalize('NFKC'), salt, KEYLEN, PARAMS);
  return ['scrypt', PARAMS.N, PARAMS.r, PARAMS.p, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password, stored) {
  const [alg, N, r, p, salt, hash] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const expected = Buffer.from(hash, 'base64');
  const key = await scrypt(password.normalize('NFKC'), Buffer.from(salt, 'base64'), expected.length,
    { N: Number(N), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 });
  return expected.length === key.length && crypto.timingSafeEqual(expected, key);
}

// A dummy hash so failed logins for unknown emails cost the same time as real ones.
let dummyHash;
export async function burnPasswordCheck(password) {
  dummyHash ||= await hashPassword('timing-equaliser');
  await verifyPassword(password, dummyHash);
}

/** Session tokens are random; only their SHA-256 is stored, so a leaked DB can't be replayed. */
const digest = (token) => crypto.createHash('sha256').update(token).digest('hex');

export function createSession(db, userId, req, days) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + days * 864e5).toISOString();
  db.run('INSERT INTO sessions (id, user_id, expires_at, user_agent, ip) VALUES (?, ?, ?, ?, ?)',
    digest(token), userId, expires, String(req.get('user-agent') || '').slice(0, 200), req.ip || '');
  db.run("UPDATE users SET last_login_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?", userId);
  return { token, expires };
}

export function destroySession(db, token) {
  if (token) db.run('DELETE FROM sessions WHERE id = ?', digest(token));
}

export function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k) continue;
    const raw = part.slice(i + 1).trim();
    // a malformed cookie from anything else on the domain must never break the API
    try { out[k] = decodeURIComponent(raw); } catch { out[k] = raw; }
  }
  return out;
}

export function setSessionCookie(res, { token, expires }, secure) {
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure, path: '/', expires: new Date(expires) });
}
export function clearSessionCookie(res, secure) {
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'lax', secure, path: '/' });
}

export const publicUser = (u) => u && ({
  id: u.id,
  email: u.email,
  firstName: u.first_name,
  lastName: u.last_name,
  phone: u.phone,
  role: u.role,
  marketingOptIn: !!u.marketing_opt_in,
  createdAt: u.created_at,
});

/** Attaches req.user (or null) from the session cookie; slides expiry on use. */
export function loadUser(db) {
  return (req, _res, next) => {
    const token = parseCookies(req.headers.cookie)[COOKIE];
    req.sessionToken = token || null;
    req.user = null;
    if (token) {
      const row = db.one(
        `SELECT u.*, s.expires_at AS s_exp FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`,
        digest(token),
      );
      if (row && row.s_exp > new Date().toISOString()) req.user = row;
      else if (row) destroySession(db, token);
    }
    next();
  };
}

export const requireUser = (req, _res, next) => (req.user ? next() : next(unauthorized()));
export const requireAdmin = (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== 'admin') return next(forbidden());
  next();
};
