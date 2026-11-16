import { Router } from 'express';
import { z } from 'zod';
import { ah, parse, notFound, badRequest } from '../lib/http.js';
import { listProducts, getProduct, quote, quoteJson, findCoupon, checkCoupon, couponSummary, placeOrder, getOrder, transitionOrder } from '../lib/store.js';
import { rateLimit } from '../lib/security.js';

const email = z.string().trim().toLowerCase().email('Enter a valid email.').max(200);

const cartItems = z.array(z.object({
  productId: z.string().min(1).max(80),
  color: z.string().max(60).nullish(),
  quantity: z.number().int().min(1).max(20),
})).min(1, 'Your cart is empty.').max(50);

const addressSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  line1: z.string().trim().min(3, 'Address is required').max(200),
  line2: z.string().trim().max(200).optional().default(''),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().max(100).optional().default(''),
  zip: z.string().trim().max(20).optional().default(''),
  country: z.string().trim().max(60).optional().default('US'),
  phone: z.string().trim().min(5, 'Phone is required').max(40),
});

export function publicRoutes({ db, config, hub, mailer }) {
  const r = Router();

  r.get('/health', (_req, res) => res.json({ ok: true, version: 1, time: new Date().toISOString(), live: hub.size }));

  /* --------------------------------------------------------------- catalog */
  r.get('/products', (req, res) => {
    const q = parse(z.object({
      category: z.string().optional(),
      q: z.string().max(100).optional(),
      sort: z.enum(['featured', 'price-asc', 'price-desc', 'rating', 'newest']).optional(),
      min: z.coerce.number().optional(),
      max: z.coerce.number().optional(),
      inStock: z.enum(['1', 'true']).optional(),
    }), req.query);
    let list = listProducts(db);
    if (q.category && q.category !== 'all') list = list.filter((p) => p.category === q.category);
    if (q.q) {
      const s = q.q.toLowerCase();
      list = list.filter((p) => [p.name, p.category, p.shortDescription, p.description].some((f) => f?.toLowerCase().includes(s)));
    }
    if (q.min != null) list = list.filter((p) => p.price >= q.min);
    if (q.max != null) list = list.filter((p) => p.price <= q.max);
    if (q.inStock) list = list.filter((p) => p.inStock);
    const sorters = {
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating,
      newest: (a, b) => Number(b.isNew) - Number(a.isNew),
    };
    if (sorters[q.sort]) list = [...list].sort(sorters[q.sort]);
    res.json({ products: list, count: list.length });
  });

  r.get('/products/:id', (req, res) => {
    const p = getProduct(db, req.params.id);
    if (!p) throw notFound('Product not found.');
    res.json({ product: p });
  });

  r.get('/products/:id/reviews', (req, res) => {
    const p = getProduct(db, req.params.id);
    if (!p) throw notFound('Product not found.');
    const reviews = db.all(
      'SELECT id, author, rating, title, body, verified, created_at, user_id FROM reviews WHERE product_id = ? AND hidden = 0 ORDER BY created_at DESC LIMIT 100',
      p.id,
    ).map((x) => ({ id: x.id, author: x.author, rating: x.rating, title: x.title, body: x.body, verified: !!x.verified, createdAt: x.created_at, mine: !!req.user && x.user_id === req.user.id }));
    const dist = [5, 4, 3, 2, 1].map((s) => ({ stars: s, count: reviews.filter((x) => x.rating === s).length }));
    res.json({ rating: p.rating, reviewCount: p.reviewCount, reviews, distribution: dist });
  });

  r.post('/products/:id/reviews', rateLimit({ windowMs: 60e3, max: 5 }), ah(async (req, res) => {
    if (!req.user) throw badRequest('Sign in to write a review.');
    const p = getProduct(db, req.params.id);
    if (!p) throw notFound('Product not found.');
    const b = parse(z.object({
      rating: z.number().int().min(1).max(5),
      title: z.string().trim().max(120).optional().default(''),
      body: z.string().trim().min(10, 'Tell us a little more (10+ characters).').max(2000),
    }), req.body);
    const verified = !!db.one(
      "SELECT 1 FROM order_items i JOIN orders o ON o.id = i.order_id WHERE o.user_id = ? AND i.product_id = ? AND o.status IN ('paid','processing','shipped','delivered') LIMIT 1",
      req.user.id, p.id,
    );
    const author = `${req.user.first_name || 'Vault'} ${(req.user.last_name || 'Member').slice(0, 1)}.`;
    db.run(
      `INSERT INTO reviews (product_id, user_id, author, rating, title, body, verified) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(product_id, user_id) DO UPDATE SET rating = excluded.rating, title = excluded.title, body = excluded.body,
         verified = excluded.verified, created_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
      p.id, req.user.id, author, b.rating, b.title, b.body, verified ? 1 : 0,
    );
    const fresh = getProduct(db, p.id);
    hub.send('rating', { id: p.id, rating: fresh.rating, reviewCount: fresh.reviewCount });
    res.status(201).json({ ok: true, verified, rating: fresh.rating, reviewCount: fresh.reviewCount });
  }));

  r.post('/products/:id/notify', rateLimit({ windowMs: 60e3, max: 10 }), (req, res) => {
    const b = parse(z.object({ email }), req.body);
    if (!getProduct(db, req.params.id)) throw notFound('Product not found.');
    db.run('INSERT OR IGNORE INTO stock_alerts (email, product_id) VALUES (?, ?)', b.email, req.params.id);
    res.status(201).json({ ok: true });
  });

  /* ------------------------------------------------------------- checkout */
  r.post('/cart/quote', (req, res) => {
    const b = parse(z.object({
      items: cartItems,
      couponCode: z.string().trim().max(40).optional(),
      shippingMethod: z.enum(['standard', 'express']).optional(),
      email: z.string().optional(),
    }), req.body);
    res.json(quoteJson(quote(db, config, { ...b, userId: req.user?.id, email: b.email || req.user?.email })));
  });

  r.post('/coupons/validate', rateLimit({ windowMs: 60e3, max: 20 }), (req, res) => {
    const b = parse(z.object({ code: z.string().trim().min(1).max(40), subtotal: z.number().min(0), email: z.string().optional() }), req.body);
    const c = findCoupon(db, b.code);
    checkCoupon(db, c, { subtotalCents: Math.round(b.subtotal * 100), userId: req.user?.id, email: b.email || req.user?.email });
    res.json({ coupon: couponSummary(c) });
  });

  r.post('/orders', rateLimit({ windowMs: 60e3, max: config.orderRateLimit ?? 15, message: 'Too many checkout attempts. Wait a minute and try again.' }), (req, res) => {
    const b = parse(z.object({
      email,
      items: cartItems,
      address: addressSchema,
      shippingMethod: z.enum(['standard', 'express']).default('standard'),
      couponCode: z.string().trim().max(40).optional(),
      payment: z.object({
        method: z.enum(['card', 'paypal', 'apple', 'cod']),
        last4: z.string().regex(/^\d{4}$/).optional(),
      }),
      notes: z.string().max(500).optional(),
      idempotencyKey: z.string().min(8).max(80).optional(),
      saveAddress: z.boolean().optional(),
    }), req.body);
    const order = placeOrder(db, config, b, { user: req.user, hub, mailer });
    if (req.user && b.saveAddress) {
      const a = b.address;
      const dup = db.one('SELECT id FROM addresses WHERE user_id = ? AND line1 = ? AND city = ?', req.user.id, a.line1, a.city);
      const count = db.one('SELECT COUNT(*) n FROM addresses WHERE user_id = ?', req.user.id).n;
      if (!dup && count < 10) {
        const first = !db.one('SELECT 1 FROM addresses WHERE user_id = ?', req.user.id);
        db.run('INSERT INTO addresses (user_id, first_name, last_name, line1, line2, city, state, zip, country, phone, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          req.user.id, a.firstName, a.lastName, a.line1, a.line2, a.city, a.state, a.zip, a.country, a.phone, first ? 1 : 0);
      }
    }
    res.status(201).json({ order });
  });

  /** Public tracking: order number + the email it was placed with (or the signed-in owner). */
  r.get('/orders/:number', (req, res) => {
    const o = getOrder(db, req.params.number.toUpperCase());
    const mail = String(req.query.email || '').trim().toLowerCase();
    const allowed = o && ((req.user && (o.userId === req.user.id || req.user.role === 'admin')) || (mail && o.email.toLowerCase() === mail));
    if (!allowed) throw notFound('No order matches that number and email.');
    res.json({ order: o });
  });

  r.post('/orders/:number/cancel', (req, res) => {
    const o = getOrder(db, req.params.number.toUpperCase());
    const mail = String(req.body?.email || '').trim().toLowerCase();
    const allowed = o && ((req.user && o.userId === req.user.id) || (mail && o.email.toLowerCase() === mail));
    if (!allowed) throw notFound('No order matches that number and email.');
    if (!['pending', 'paid'].includes(o.status)) throw badRequest('This order is already being prepared — contact support to change it.');
    res.json({ order: transitionOrder(db, o.number, 'cancelled', { actor: 'customer', note: 'Cancelled by customer', hub, mailer }) });
  });

  /* ------------------------------------------------------------ marketing */
  r.post('/newsletter', rateLimit({ windowMs: 60e3, max: 10 }), (req, res) => {
    const b = parse(z.object({ email, source: z.string().max(40).optional() }), req.body);
    const r2 = db.run('INSERT OR IGNORE INTO subscribers (email, source) VALUES (?, ?)', b.email, b.source || 'footer');
    if (r2.changes) mailer.send(b.email, 'Welcome to the vault', 'You are on the list. Use WELCOME15 for 15% off your first order.', 'newsletter');
    res.status(201).json({ ok: true, alreadySubscribed: r2.changes === 0 });
  });

  r.post('/contact', rateLimit({ windowMs: 60e3, max: 5 }), (req, res) => {
    const b = parse(z.object({
      name: z.string().trim().min(1, 'Name is required').max(100),
      email,
      subject: z.string().trim().max(150).optional().default(''),
      message: z.string().trim().min(10, 'Message is too short').max(5000),
    }), req.body);
    db.run('INSERT INTO messages (name, email, subject, body) VALUES (?, ?, ?, ?)', b.name, b.email, b.subject, b.message);
    hub.send('message:new', { from: b.email, subject: b.subject }, 'admins');
    res.status(201).json({ ok: true });
  });

  /** Lightweight first-party analytics (no cookies, no third parties). */
  r.post('/analytics', rateLimit({ windowMs: 60e3, max: 120 }), (req, res) => {
    const b = parse(z.object({
      type: z.enum(['page_view', 'product_view', 'add_to_cart', 'checkout_start', 'template_switch', 'vault_enter']),
      productId: z.string().max(80).optional(),
      template: z.string().max(20).optional(),
      path: z.string().max(200).optional(),
      session: z.string().max(40).optional(),
    }), req.body);
    db.run('INSERT INTO analytics (type, product_id, template, path, session) VALUES (?, ?, ?, ?, ?)',
      b.type, b.productId || null, b.template || null, b.path || null, b.session || null);
    res.status(204).end();
  });

  /* ---------------------------------------------------------------- live */
  r.get('/events', (req, res) => hub.attach(req, res));

  return r;
}

export { addressSchema, email as emailSchema };
