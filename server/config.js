import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..');

const env = process.env;
const num = (v, d) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : d);

export const config = {
  env: env.NODE_ENV || 'development',
  isProd: env.NODE_ENV === 'production',
  port: num(env.PORT, 8787),
  host: env.HOST || (env.NODE_ENV === 'production' || env.PORT ? '0.0.0.0' : '127.0.0.1'),
  dbFile: env.DB_FILE || path.join(ROOT, 'server', 'data', 'neonvault.db'),
  distDir: path.join(ROOT, 'dist'),
  // Mark cookies Secure when the site is served over https (set COOKIE_SECURE=1 behind TLS).
  cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === '1' : env.NODE_ENV === 'production',
  // Address used in emailed links (password reset, tracking). Never taken from request headers.
  publicUrl: (env.PUBLIC_URL || (env.NODE_ENV === 'production' ? `http://localhost:${num(env.PORT, 8787)}` : 'http://localhost:5173')).replace(/\/$/, ''),
  sessionDays: num(env.SESSION_DAYS, 30),
  adminEmail: (env.ADMIN_EMAIL || 'admin@neonvault.local').toLowerCase(),
  adminPassword: env.ADMIN_PASSWORD || '',
  // Store pricing rules (must match what the storefront shows).
  pricing: {
    taxRate: 0.08,
    freeShippingOverCents: 20000,
    standardShippingCents: 1500,
    expressShippingCents: 2500,
  },
  // sign-in / sign-up attempts per IP per minute
  authRateLimit: num(env.AUTH_RATE_LIMIT, 12),
  // checkout attempts per IP per minute
  orderRateLimit: num(env.ORDER_RATE_LIMIT, 15),
  lowStockThreshold: num(env.LOW_STOCK, 10),
};
