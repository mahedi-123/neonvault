import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { parse, notFound, badRequest, conflict } from '../lib/http.js';
import { requireAdmin, publicUser } from '../lib/auth.js';
import { listProducts, getProduct, getOrder, transitionOrder, ORDER_STATUSES, notifyBackInStock } from '../lib/store.js';

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  // neutralise spreadsheet formula injection and quote everything
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};
const toCsv = (rows, cols) => [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\r\n');

export function adminRoutes({ db, config, hub, mailer }) {
  const r = Router();
  r.use(requireAdmin);

  const audit = (req, action, target, meta = {}) =>
    db.run('INSERT INTO audit_log (user_id, action, target, meta) VALUES (?, ?, ?, ?)', req.user.id, action, target, JSON.stringify(meta));

  /* ------------------------------------------------------------- dashboard */
  r.get('/stats', (req, res) => {
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 14));
    const since = (d) => new Date(Date.now() - d * 864e5).toISOString();
    const live = "status NOT IN ('cancelled','refunded')";
    const sum = (from) => db.one(`SELECT COALESCE(SUM(total_cents),0) s, COUNT(*) n FROM orders WHERE ${live} AND created_at >= ?`, from);
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const t = sum(today.toISOString());
    const w = sum(since(7));
    const m = sum(since(30));
    const prevW = db.one(`SELECT COALESCE(SUM(total_cents),0) s FROM orders WHERE ${live} AND created_at >= ? AND created_at < ?`, since(14), since(7));

    const byDay = db.all(
      `SELECT substr(created_at,1,10) d, COALESCE(SUM(total_cents),0) s, COUNT(*) n FROM orders WHERE ${live} AND created_at >= ? GROUP BY d ORDER BY d`,
      since(days),
    );
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
      const row = byDay.find((x) => x.d === d);
      series.push({ date: d, revenue: (row?.s || 0) / 100, orders: row?.n || 0 });
    }

    const top = db.all(
      `SELECT i.product_id id, i.name, SUM(i.quantity) units, SUM(i.quantity * i.unit_price_cents) rev
       FROM order_items i JOIN orders o ON o.id = i.order_id WHERE o.${live} AND o.created_at >= ?
       GROUP BY i.product_id ORDER BY rev DESC LIMIT 6`, since(30),
    ).map((x) => ({ ...x, revenue: x.rev / 100 }));

    const views = db.one("SELECT COUNT(*) n FROM analytics WHERE type = 'page_view' AND created_at >= ?", since(7)).n;
    const sessions = db.one("SELECT COUNT(DISTINCT session) n FROM analytics WHERE created_at >= ?", since(7)).n;
    const carts = db.one("SELECT COUNT(DISTINCT session) n FROM analytics WHERE type = 'add_to_cart' AND created_at >= ?", since(7)).n;
    const checkouts = db.one("SELECT COUNT(DISTINCT session) n FROM analytics WHERE type = 'checkout_start' AND created_at >= ?", since(7)).n;
    const templates = db.all("SELECT template, COUNT(*) n FROM analytics WHERE type = 'page_view' AND created_at >= ? AND template IS NOT NULL GROUP BY template", since(30));

    res.json({
      revenue: { today: t.s / 100, week: w.s / 100, month: m.s / 100, prevWeek: prevW.s / 100 },
      orders: { today: t.n, week: w.n, month: m.n, aov: m.n ? m.s / m.n / 100 : 0 },
      statusCounts: Object.fromEntries(db.all('SELECT status, COUNT(*) n FROM orders GROUP BY status').map((x) => [x.status, x.n])),
      customers: db.one("SELECT COUNT(*) n FROM users WHERE role = 'customer'").n,
      newCustomers: db.one("SELECT COUNT(*) n FROM users WHERE role = 'customer' AND created_at >= ?", since(7)).n,
      subscribers: db.one('SELECT COUNT(*) n FROM subscribers').n,
      unreadMessages: db.one('SELECT COUNT(*) n FROM messages WHERE handled = 0').n,
      lowStock: db.all('SELECT id, name, stock FROM products WHERE active = 1 AND stock <= ? ORDER BY stock LIMIT 10', config.lowStockThreshold),
      stockAlerts: db.one('SELECT COUNT(*) n FROM stock_alerts').n,
      series,
      topProducts: top,
      funnel: { sessions, views, carts, checkouts, orders: w.n },
      templates,
      liveVisitors: hub.size,
    });
  });

  /* ---------------------------------------------------------------- orders */
  r.get('/orders', (req, res) => {
    const q = parse(z.object({
      status: z.enum([...ORDER_STATUSES, 'all']).optional(),
      q: z.string().max(100).optional(),
      limit: z.coerce.number().int().min(1).max(200).default(50),
      offset: z.coerce.number().int().min(0).default(0),
    }), req.query);
    const where = [];
    const params = [];
    if (q.status && q.status !== 'all') { where.push('status = ?'); params.push(q.status); }
    if (q.q) { where.push('(number LIKE ? OR email LIKE ?)'); params.push(`%${q.q}%`, `%${q.q}%`); }
    const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = db.one(`SELECT COUNT(*) n FROM orders ${w}`, ...params).n;
    const rows = db.all(`SELECT number FROM orders ${w} ORDER BY created_at DESC LIMIT ? OFFSET ?`, ...params, q.limit, q.offset);
    res.json({ total, orders: rows.map((x) => getOrder(db, x.number)) });
  });

  r.get('/orders.csv', (_req, res) => {
    const rows = db.all('SELECT number, email, status, payment_method, payment_status, subtotal_cents/100.0 subtotal, discount_cents/100.0 discount, shipping_cents/100.0 shipping, tax_cents/100.0 tax, total_cents/100.0 total, coupon_code, created_at FROM orders ORDER BY created_at DESC');
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="neonvault-orders.csv"' });
    res.send(toCsv(rows, ['number', 'email', 'status', 'payment_method', 'payment_status', 'subtotal', 'discount', 'shipping', 'tax', 'total', 'coupon_code', 'created_at']));
  });

  r.get('/orders/:number', (req, res) => {
    const o = getOrder(db, req.params.number);
    if (!o) throw notFound('Order not found.');
    res.json({ order: o, allowed: [] });
  });

  r.patch('/orders/:number', (req, res) => {
    const b = parse(z.object({
      status: z.enum(ORDER_STATUSES),
      note: z.string().max(300).optional().default(''),
      trackingNumber: z.string().trim().max(60).optional(),
    }), req.body);
    if (b.status === 'shipped' && !b.trackingNumber && !getOrder(db, req.params.number)?.trackingNumber) {
      throw badRequest('Add a tracking number to mark this order shipped.', { fields: { trackingNumber: 'Required to ship' } });
    }
    const o = transitionOrder(db, req.params.number, b.status, { actor: req.user.email, note: b.note, trackingNumber: b.trackingNumber, hub, mailer });
    audit(req, 'order.status', o.number, { status: b.status });
    res.json({ order: o });
  });

  /* -------------------------------------------------------------- products */
  r.get('/products', (_req, res) => {
    const sold = new Map(db.all(
      "SELECT i.product_id id, SUM(i.quantity) n FROM order_items i JOIN orders o ON o.id = i.order_id WHERE o.status NOT IN ('cancelled','refunded') GROUP BY i.product_id",
    ).map((x) => [x.id, x.n]));
    const waiting = new Map(db.all('SELECT product_id id, COUNT(*) n FROM stock_alerts GROUP BY product_id').map((x) => [x.id, x.n]));
    res.json({ products: listProducts(db, { includeInactive: true }).map((p) => ({ ...p, sold: sold.get(p.id) || 0, waiting: waiting.get(p.id) || 0 })) });
  });

  const productPatch = z.object({
    name: z.string().trim().min(1).max(120).optional(),
    price: z.number().min(0).max(100000).optional(),
    originalPrice: z.number().min(0).max(100000).nullable().optional(),
    stock: z.number().int().min(0).max(100000).optional(),
    // optimistic lock: the stock the admin was looking at; refused if sales changed it meanwhile
    expectedStock: z.number().int().min(0).optional(),
    active: z.boolean().optional(),
    tag: z.string().max(30).nullable().optional(),
    shortDescription: z.string().max(200).optional(),
    description: z.string().max(4000).optional(),
    isNew: z.boolean().optional(),
    isLimited: z.boolean().optional(),
    isBestSeller: z.boolean().optional(),
  });

  r.patch('/products/:id', async (req, res) => {
    const b = parse(productPatch, req.body);
    const row = db.one('SELECT * FROM products WHERE id = ?', req.params.id);
    if (!row) throw notFound('Product not found.');
    if (b.stock != null && b.expectedStock != null && b.expectedStock !== row.stock) {
      throw conflict(`Stock changed to ${row.stock} while you were editing (new orders came in). Reload and try again.`, { current: row.stock });
    }
    const data = JSON.parse(row.data);
    for (const k of ['tag', 'shortDescription', 'description', 'isNew', 'isLimited', 'isBestSeller']) if (b[k] !== undefined) data[k] = b[k];
    const wasOut = row.stock === 0;
    db.run(`UPDATE products SET name = ?, price_cents = ?, original_price_cents = ?, stock = ?, active = ?, data = ?,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
      b.name ?? row.name,
      b.price != null ? Math.round(b.price * 100) : row.price_cents,
      b.originalPrice === undefined ? row.original_price_cents : b.originalPrice ? Math.round(b.originalPrice * 100) : null,
      b.stock ?? row.stock,
      b.active == null ? row.active : b.active ? 1 : 0,
      JSON.stringify(data), row.id);
    const p = getProduct(db, row.id, { includeInactive: true });
    if (b.stock != null) hub.send('stock', { id: p.id, stockCount: p.stockCount });
    let notified = 0;
    if (wasOut && p.stockCount > 0) notified = await notifyBackInStock(db, p.id, mailer);
    audit(req, 'product.update', p.id, b);
    res.json({ product: p, notified });
  });

  r.post('/products', (req, res) => {
    const b = parse(z.object({
      id: z.string().trim().regex(/^[a-z0-9-]{3,60}$/, 'Use lowercase letters, numbers and dashes.'),
      name: z.string().trim().min(1).max(120),
      category: z.string().trim().min(1).max(40),
      price: z.number().min(0).max(100000),
      stock: z.number().int().min(0).default(0),
      image: z.string().url().optional(),
      shortDescription: z.string().max(200).default(''),
      description: z.string().max(4000).default(''),
    }), req.body);
    if (db.one('SELECT 1 FROM products WHERE id = ?', b.id)) throw conflict('A product with this id already exists.', { fields: { id: 'Taken' } });
    const data = {
      subcategory: '', tag: 'NEW', tagVariant: 'accent', images: b.image ? [b.image] : [], colors: [{ name: 'Default', value: '#111111', hex: '#111111' }],
      isNew: true, isLimited: false, isBestSeller: false, description: b.description, shortDescription: b.shortDescription, specs: {}, features: [], includes: [],
    };
    const sort = db.one('SELECT COALESCE(MAX(sort),0)+1 s FROM products').s;
    db.run('INSERT INTO products (id, name, category, price_cents, stock, sort, data) VALUES (?, ?, ?, ?, ?, ?, ?)',
      b.id, b.name, b.category, Math.round(b.price * 100), b.stock, sort, JSON.stringify(data));
    audit(req, 'product.create', b.id);
    res.status(201).json({ product: getProduct(db, b.id, { includeInactive: true }) });
  });

  /* --------------------------------------------------------------- coupons */
  const toCoupon = (c) => ({
    code: c.code, description: c.description, type: c.type, value: c.value, minSubtotal: c.min_subtotal_cents / 100,
    maxUses: c.max_uses, usedCount: c.used_count, perUserOnce: !!c.per_user_once, expiresAt: c.expires_at, active: !!c.active,
  });
  r.get('/coupons', (_req, res) => res.json({ coupons: db.all('SELECT * FROM coupons ORDER BY created_at DESC').map(toCoupon) }));
  const couponBody = z.object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, '3–30 letters/numbers'),
    description: z.string().trim().max(120).default(''),
    type: z.enum(['percent', 'fixed', 'shipping']),
    value: z.number().min(0),
    minSubtotal: z.number().min(0).default(0),
    maxUses: z.number().int().min(1).nullable().optional(),
    perUserOnce: z.boolean().default(false),
    expiresAt: z.string().datetime().nullable().optional(),
    active: z.boolean().default(true),
  }).refine((c) => c.type !== 'percent' || (c.value > 0 && c.value <= 90), { message: 'Percent must be 1–90', path: ['value'] });
  r.post('/coupons', (req, res) => {
    const c = parse(couponBody, req.body);
    if (db.one('SELECT 1 FROM coupons WHERE code = ?', c.code)) throw conflict('That code already exists.', { fields: { code: 'Taken' } });
    db.run('INSERT INTO coupons (code, description, type, value, min_subtotal_cents, max_uses, per_user_once, expires_at, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      c.code, c.description, c.type, c.type === 'fixed' ? Math.round(c.value * 100) : Math.round(c.value), Math.round(c.minSubtotal * 100),
      c.maxUses ?? null, c.perUserOnce ? 1 : 0, c.expiresAt ?? null, c.active ? 1 : 0);
    audit(req, 'coupon.create', c.code);
    res.status(201).json({ coupon: toCoupon(db.one('SELECT * FROM coupons WHERE code = ?', c.code)) });
  });
  r.patch('/coupons/:code', (req, res) => {
    const b = parse(z.object({ active: z.boolean() }), req.body);
    const r2 = db.run('UPDATE coupons SET active = ? WHERE code = ?', b.active ? 1 : 0, req.params.code);
    if (!r2.changes) throw notFound('Coupon not found.');
    audit(req, 'coupon.toggle', req.params.code, b);
    res.json({ coupon: toCoupon(db.one('SELECT * FROM coupons WHERE code = ?', req.params.code)) });
  });
  r.delete('/coupons/:code', (req, res) => {
    const r2 = db.run('DELETE FROM coupons WHERE code = ?', req.params.code);
    if (!r2.changes) throw notFound('Coupon not found.');
    audit(req, 'coupon.delete', req.params.code);
    res.json({ ok: true });
  });

  /* ----------------------------------------------------- customers & inbox */
  r.get('/customers', (req, res) => {
    const q = String(req.query.q || '').trim();
    const rows = db.all(
      `SELECT u.*, (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) orders,
              (SELECT COALESCE(SUM(total_cents),0) FROM orders o WHERE o.user_id = u.id AND o.status NOT IN ('cancelled','refunded')) spent
       FROM users u WHERE (? = '' OR u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?) ORDER BY u.created_at DESC LIMIT 200`,
      q, `%${q}%`, `%${q}%`, `%${q}%`,
    );
    res.json({ customers: rows.map((u) => ({ ...publicUser(u), orders: u.orders, spent: u.spent / 100, lastLoginAt: u.last_login_at })) });
  });

  r.get('/messages', (_req, res) => res.json({ messages: db.all('SELECT * FROM messages ORDER BY created_at DESC LIMIT 200').map((m) => ({ ...m, handled: !!m.handled })) }));
  r.patch('/messages/:id', (req, res) => {
    const b = parse(z.object({ handled: z.boolean() }), req.body);
    db.run('UPDATE messages SET handled = ? WHERE id = ?', b.handled ? 1 : 0, Number(req.params.id));
    res.json({ ok: true });
  });

  r.get('/reviews', (_req, res) => res.json({
    reviews: db.all('SELECT r.*, p.name product_name FROM reviews r JOIN products p ON p.id = r.product_id ORDER BY r.created_at DESC LIMIT 200')
      .map((x) => ({ id: x.id, productId: x.product_id, productName: x.product_name, author: x.author, rating: x.rating, title: x.title, body: x.body, verified: !!x.verified, hidden: !!x.hidden, createdAt: x.created_at })),
  }));
  r.patch('/reviews/:id', (req, res) => {
    const b = parse(z.object({ hidden: z.boolean() }), req.body);
    db.run('UPDATE reviews SET hidden = ? WHERE id = ?', b.hidden ? 1 : 0, Number(req.params.id));
    audit(req, 'review.moderate', String(req.params.id), b);
    res.json({ ok: true });
  });

  r.get('/subscribers', (_req, res) => res.json({ subscribers: db.all('SELECT * FROM subscribers ORDER BY created_at DESC') }));
  r.get('/subscribers.csv', (_req, res) => {
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="neonvault-subscribers.csv"' });
    res.send(toCsv(db.all('SELECT email, source, created_at FROM subscribers ORDER BY created_at DESC'), ['email', 'source', 'created_at']));
  });
  // reset links are secrets for the customer, not for staff
  r.get('/emails', (_req, res) => res.json({
    emails: db.all('SELECT * FROM emails ORDER BY id DESC LIMIT 100').map((m) => ({ ...m, body: m.body.replace(/token=[\w-]+/g, 'token=[hidden]') })),
  }));
  /** Consistent snapshot of the whole database (safe while the store is live). */
  r.get('/backup', (req, res) => {
    const file = path.join(os.tmpdir(), `neonvault-backup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.db`);
    db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
    audit(req, 'db.backup', path.basename(file));
    res.download(file, `neonvault-${new Date().toISOString().slice(0, 10)}.db`, () => fs.rm(file, { force: true }, () => {}));
  });

  r.get('/audit', (_req, res) => res.json({ entries: db.all('SELECT a.*, u.email FROM audit_log a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 200') }));

  return r;
}
