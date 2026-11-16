import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { parse, badRequest, conflict, unauthorized, notFound } from '../lib/http.js';
import { hashPassword, verifyPassword, burnPasswordCheck, createSession, destroySession, setSessionCookie, clearSessionCookie, publicUser, requireUser } from '../lib/auth.js';
import { rateLimit, loginGuard } from '../lib/security.js';
import { listProducts, getOrder } from '../lib/store.js';
import { addressSchema, emailSchema } from './public.js';

const password = z.string().min(8, 'Use at least 8 characters.').max(200)
  .refine((p) => /[a-zA-Z]/.test(p) && /\d/.test(p), 'Use letters and at least one number.');

const toAddress = (a) => ({
  id: a.id, label: a.label, firstName: a.first_name, lastName: a.last_name, line1: a.line1, line2: a.line2,
  city: a.city, state: a.state, zip: a.zip, country: a.country, phone: a.phone, isDefault: !!a.is_default,
});

export function accountRoutes({ db, config, mailer, hub }) {
  const r = Router();
  const guard = loginGuard();
  const authLimit = rateLimit({ windowMs: 60e3, max: config.authRateLimit ?? 12, message: 'Too many attempts. Wait a minute and try again.' });

  const startSession = (req, res, user) => {
    const s = createSession(db, user.id, req, config.sessionDays);
    setSessionCookie(res, s, config.cookieSecure);
  };

  /** Fold a guest cart/wishlist from the browser into the account on sign-in. */
  const mergeGuest = (userId, guest) => {
    if (!guest) return;
    if (Array.isArray(guest.wishlist)) {
      for (const pid of guest.wishlist.slice(0, 100)) {
        db.run('INSERT OR IGNORE INTO wishlist (user_id, product_id) SELECT ?, id FROM products WHERE id = ?', userId, String(pid));
      }
    }
    if (Array.isArray(guest.cart) && guest.cart.length) {
      const row = db.one('SELECT items FROM carts WHERE user_id = ?', userId);
      const current = row ? JSON.parse(row.items) : [];
      for (const it of guest.cart.slice(0, 50)) {
        const ex = current.find((c) => c.productId === it.productId && (c.color || null) === (it.color || null));
        if (ex) ex.quantity = Math.min(20, Math.max(ex.quantity, it.quantity));
        else current.push({ productId: String(it.productId), color: it.color || null, quantity: Math.min(20, Number(it.quantity) || 1) });
      }
      db.run(`INSERT INTO carts (user_id, items) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET items = excluded.items,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`, userId, JSON.stringify(current));
    }
  };

  const guestSchema = z.object({
    cart: z.array(z.object({ productId: z.string(), color: z.string().nullish(), quantity: z.number().int().min(1).max(20) })).max(50).optional(),
    wishlist: z.array(z.string()).max(100).optional(),
  }).optional();

  r.post('/auth/register', authLimit, async (req, res) => {
    const b = parse(z.object({
      email: emailSchema,
      password,
      firstName: z.string().trim().min(1, 'First name is required').max(80),
      lastName: z.string().trim().min(1, 'Last name is required').max(80),
      phone: z.string().trim().max(40).optional().default(''),
      marketingOptIn: z.boolean().optional(),
      guest: guestSchema,
    }), req.body);
    const taken = () => conflict('An account with this email already exists. Sign in instead.', { fields: { email: 'Already registered' } });
    if (db.one('SELECT 1 FROM users WHERE email = ?', b.email)) throw taken();
    const hash = await hashPassword(b.password);
    let id;
    try {
      ({ id } = db.run('INSERT INTO users (email, password_hash, first_name, last_name, phone, marketing_opt_in) VALUES (?, ?, ?, ?, ?, ?)',
        b.email, hash, b.firstName, b.lastName, b.phone, b.marketingOptIn ? 1 : 0));
    } catch (e) {
      if (/UNIQUE/i.test(String(e?.message))) throw taken(); // two sign-ups racing
      throw e;
    }
    // Guest orders are NOT attached automatically — owning an email isn't proven
    // by typing it. They can be added with the order number (POST /me/orders/claim).
    if (b.marketingOptIn) db.run('INSERT OR IGNORE INTO subscribers (email, source) VALUES (?, ?)', b.email, 'signup');
    mergeGuest(id, b.guest);
    const user = db.one('SELECT * FROM users WHERE id = ?', id);
    startSession(req, res, user);
    mailer.send(b.email, 'Welcome to NEONVAULT', `Hi ${b.firstName}, your vault account is ready.`, 'welcome');
    res.status(201).json({ user: publicUser(user) });
  });

  r.post('/auth/login', authLimit, async (req, res) => {
    const b = parse(z.object({ email: emailSchema, password: z.string().min(1, 'Password is required').max(200), guest: guestSchema }), req.body);
    guard.attempt(b.email);
    const user = db.one('SELECT * FROM users WHERE email = ?', b.email);
    const ok = user ? await verifyPassword(b.password, user.password_hash) : (await burnPasswordCheck(b.password), false);
    if (!ok) {
      guard.fail(b.email);
      throw unauthorized('Email or password is incorrect.');
    }
    guard.ok(b.email);
    mergeGuest(user.id, b.guest);
    startSession(req, res, user);
    res.json({ user: publicUser(user) });
  });

  r.post('/auth/logout', (req, res) => {
    destroySession(db, req.sessionToken);
    hub.forget({ sid: req.sessionToken });
    clearSessionCookie(res, config.cookieSecure);
    res.json({ ok: true });
  });

  r.get('/auth/me', (req, res) => res.json({ user: publicUser(req.user) }));

  /**
   * Password reset. The response is identical whether or not the email exists
   * (no account enumeration); the link carries a random token whose hash is
   * stored, valid for one hour and one use.
   */
  r.post('/auth/forgot', authLimit, (req, res) => {
    const b = parse(z.object({ email: emailSchema }), req.body);
    const user = db.one('SELECT * FROM users WHERE email = ?', b.email);
    if (user) {
      const token = crypto.randomBytes(32).toString('base64url');
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      db.run('DELETE FROM password_resets WHERE user_id = ?', user.id);
      db.run('INSERT INTO password_resets (id, user_id, expires_at) VALUES (?, ?, ?)', hash, user.id, new Date(Date.now() + 36e5).toISOString());
      // the link's host comes from config, never from request headers (which an attacker controls)
      mailer.send(user.email, 'Reset your NEONVAULT password',
        `Someone asked to reset the password for this account.\n\nSet a new one here (valid for 1 hour):\n${config.publicUrl}/reset-password?token=${token}\n\nIf it wasn't you, ignore this email.`, 'password-reset');
    }
    res.json({ ok: true });
  });

  r.post('/auth/reset', authLimit, async (req, res) => {
    const b = parse(z.object({ token: z.string().min(20).max(200), password }), req.body);
    const hash = crypto.createHash('sha256').update(b.token).digest('hex');
    const row = db.one('SELECT * FROM password_resets WHERE id = ?', hash);
    if (!row || row.used || row.expires_at < new Date().toISOString()) throw badRequest('This reset link is invalid or has expired. Request a new one.');
    const newHash = await hashPassword(b.password);
    // re-check after the slow hash, then switch password and revoke sessions atomically
    const done = db.tx(() => {
      const r = db.run('UPDATE password_resets SET used = 1 WHERE id = ? AND used = 0', hash);
      if (!r.changes) return false;
      db.run('UPDATE users SET password_hash = ? WHERE id = ?', newHash, row.user_id);
      db.run('DELETE FROM sessions WHERE user_id = ?', row.user_id);
      return true;
    });
    if (!done) throw badRequest('This reset link has already been used.');
    hub.forget({ userId: row.user_id });
    const user = db.one('SELECT * FROM users WHERE id = ?', row.user_id);
    guard.ok(user.email);
    startSession(req, res, user);
    res.json({ user: publicUser(user) });
  });

  /* ------------------------------------------------- everything below: signed in */
  r.use('/me', requireUser);

  r.patch('/me', (req, res) => {
    const b = parse(z.object({
      firstName: z.string().trim().min(1).max(80).optional(),
      lastName: z.string().trim().min(1).max(80).optional(),
      phone: z.string().trim().max(40).optional(),
      marketingOptIn: z.boolean().optional(),
    }), req.body);
    const u = req.user;
    db.run('UPDATE users SET first_name = ?, last_name = ?, phone = ?, marketing_opt_in = ? WHERE id = ?',
      b.firstName ?? u.first_name, b.lastName ?? u.last_name, b.phone ?? u.phone,
      b.marketingOptIn == null ? u.marketing_opt_in : b.marketingOptIn ? 1 : 0, u.id);
    res.json({ user: publicUser(db.one('SELECT * FROM users WHERE id = ?', u.id)) });
  });

  r.post('/me/password', authLimit, async (req, res) => {
    const b = parse(z.object({ currentPassword: z.string().min(1), newPassword: password }), req.body);
    if (!(await verifyPassword(b.currentPassword, req.user.password_hash))) throw badRequest('Current password is incorrect.', { fields: { currentPassword: 'Incorrect' } });
    const newHash = await hashPassword(b.newPassword);
    // sign out every other device
    db.tx(() => {
      db.run('UPDATE users SET password_hash = ? WHERE id = ?', newHash, req.user.id);
      db.run('DELETE FROM sessions WHERE user_id = ?', req.user.id);
    });
    hub.forget({ userId: req.user.id });
    startSession(req, res, req.user);
    res.json({ ok: true });
  });

  r.delete('/me', async (req, res) => {
    const b = parse(z.object({ password: z.string().min(1) }), req.body);
    if (req.user.role === 'admin') throw badRequest('Admin accounts cannot be deleted from here.');
    if (!(await verifyPassword(b.password, req.user.password_hash))) throw badRequest('Password is incorrect.');
    db.run('DELETE FROM users WHERE id = ?', req.user.id);
    clearSessionCookie(res, config.cookieSecure);
    res.json({ ok: true });
  });

  /* addresses */
  r.get('/me/addresses', (req, res) => {
    res.json({ addresses: db.all('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id', req.user.id).map(toAddress) });
  });
  r.post('/me/addresses', (req, res) => {
    const a = parse(addressSchema.extend({ label: z.string().trim().max(40).optional().default('Home'), isDefault: z.boolean().optional() }), req.body);
    if (db.one('SELECT COUNT(*) n FROM addresses WHERE user_id = ?', req.user.id).n >= 10) throw badRequest('You can save up to 10 addresses.');
    const first = !db.one('SELECT 1 FROM addresses WHERE user_id = ?', req.user.id);
    db.tx(() => {
      if (a.isDefault) db.run('UPDATE addresses SET is_default = 0 WHERE user_id = ?', req.user.id);
      db.run('INSERT INTO addresses (user_id, label, first_name, last_name, line1, line2, city, state, zip, country, phone, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        req.user.id, a.label, a.firstName, a.lastName, a.line1, a.line2, a.city, a.state, a.zip, a.country, a.phone, a.isDefault || first ? 1 : 0);
    });
    res.status(201).json({ addresses: db.all('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id', req.user.id).map(toAddress) });
  });
  r.delete('/me/addresses/:id', (req, res) => {
    const r2 = db.run('DELETE FROM addresses WHERE id = ? AND user_id = ?', Number(req.params.id), req.user.id);
    if (!r2.changes) throw notFound('Address not found.');
    if (!db.one('SELECT 1 FROM addresses WHERE user_id = ? AND is_default = 1', req.user.id)) {
      db.run('UPDATE addresses SET is_default = 1 WHERE id = (SELECT id FROM addresses WHERE user_id = ? ORDER BY id LIMIT 1)', req.user.id);
    }
    res.json({ addresses: db.all('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id', req.user.id).map(toAddress) });
  });

  /* wishlist */
  const wishlist = (uid) => {
    const ids = new Set(db.all('SELECT product_id FROM wishlist WHERE user_id = ?', uid).map((x) => x.product_id));
    return listProducts(db).filter((p) => ids.has(p.id));
  };
  r.get('/me/wishlist', (req, res) => res.json({ items: wishlist(req.user.id) }));
  r.put('/me/wishlist/:productId', (req, res) => {
    db.run('INSERT OR IGNORE INTO wishlist (user_id, product_id) SELECT ?, id FROM products WHERE id = ?', req.user.id, req.params.productId);
    res.json({ items: wishlist(req.user.id) });
  });
  r.delete('/me/wishlist/:productId', (req, res) => {
    db.run('DELETE FROM wishlist WHERE user_id = ? AND product_id = ?', req.user.id, req.params.productId);
    res.json({ items: wishlist(req.user.id) });
  });

  /* cart (synced across devices) */
  r.get('/me/cart', (req, res) => {
    const row = db.one('SELECT items FROM carts WHERE user_id = ?', req.user.id);
    res.json({ items: row ? JSON.parse(row.items) : [] });
  });
  r.put('/me/cart', (req, res) => {
    const b = parse(z.object({
      items: z.array(z.object({ productId: z.string().max(80), color: z.string().max(60).nullish(), quantity: z.number().int().min(1).max(20) })).max(50),
    }), req.body);
    db.run(`INSERT INTO carts (user_id, items) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET items = excluded.items,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`, req.user.id, JSON.stringify(b.items));
    res.json({ items: b.items });
  });

  /* orders */
  r.get('/me/orders', (req, res) => {
    const nums = db.all('SELECT number FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', req.user.id);
    res.json({ orders: nums.map((n) => getOrder(db, n.number)) });
  });

  /**
   * Attach a guest order to this account. Requires the order number (only sent
   * to the buyer's inbox) and that the order's email is this account's email.
   */
  r.post('/me/orders/claim', rateLimit({ windowMs: 60e3, max: 10 }), (req, res) => {
    const b = parse(z.object({ number: z.string().trim().min(5).max(40) }), req.body);
    const o = db.one('SELECT id, user_id, email FROM orders WHERE number = ?', b.number.toUpperCase());
    if (!o || o.email.toLowerCase() !== req.user.email.toLowerCase()) throw notFound('No order with that number was placed with your email.');
    if (o.user_id && o.user_id !== req.user.id) throw notFound('No order with that number was placed with your email.');
    db.run('UPDATE orders SET user_id = ? WHERE id = ?', req.user.id, o.id);
    res.json({ order: getOrder(db, b.number.toUpperCase()) });
  });

  r.get('/me/summary', (req, res) => {
    const uid = req.user.id;
    res.json({
      orders: db.one('SELECT COUNT(*) n FROM orders WHERE user_id = ?', uid).n,
      spent: (db.one("SELECT COALESCE(SUM(total_cents),0) s FROM orders WHERE user_id = ? AND status NOT IN ('cancelled','refunded')", uid).s) / 100,
      wishlist: db.one('SELECT COUNT(*) n FROM wishlist WHERE user_id = ?', uid).n,
      addresses: db.one('SELECT COUNT(*) n FROM addresses WHERE user_id = ?', uid).n,
      reviews: db.one('SELECT COUNT(*) n FROM reviews WHERE user_id = ?', uid).n,
    });
  });

  return r;
}
