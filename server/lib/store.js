import crypto from 'node:crypto';
import { badRequest, conflict, HttpError, notFound } from './http.js';

/* ------------------------------------------------------------------ catalog */

/** Review aggregates blended with the catalog's launch ratings. */
function ratingFor(row, agg) {
  const n = row.seed_review_count + (agg?.n || 0);
  const sum = row.seed_rating * row.seed_review_count + (agg?.sum || 0);
  return { rating: n ? Math.round((sum / n) * 10) / 10 : 0, reviewCount: n };
}

export function toProduct(row, agg) {
  const data = JSON.parse(row.data);
  return {
    ...data,
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price_cents / 100,
    originalPrice: row.original_price_cents ? row.original_price_cents / 100 : null,
    stockCount: row.stock,
    inStock: row.stock > 0,
    active: !!row.active,
    ...ratingFor(row, agg),
  };
}

export function reviewAggregates(db, productId) {
  const rows = productId
    ? db.all('SELECT product_id, COUNT(*) n, SUM(rating) sum FROM reviews WHERE hidden = 0 AND product_id = ? GROUP BY product_id', productId)
    : db.all('SELECT product_id, COUNT(*) n, SUM(rating) sum FROM reviews WHERE hidden = 0 GROUP BY product_id');
  return new Map(rows.map((r) => [r.product_id, r]));
}

export function listProducts(db, { includeInactive = false } = {}) {
  const agg = reviewAggregates(db);
  return db.all(`SELECT * FROM products ${includeInactive ? '' : 'WHERE active = 1'} ORDER BY sort, created_at`)
    .map((r) => toProduct(r, agg.get(r.id)));
}

export function getProduct(db, id, { includeInactive = false } = {}) {
  const row = db.one(`SELECT * FROM products WHERE id = ? ${includeInactive ? '' : 'AND active = 1'}`, id);
  if (!row) return null;
  return toProduct(row, reviewAggregates(db, id).get(id));
}

/* ------------------------------------------------------------------ pricing */

export function findCoupon(db, code) {
  if (!code) return null;
  return db.one('SELECT * FROM coupons WHERE code = ?', String(code).trim());
}

/** Throws a readable 400 when a coupon can't be used for this cart. */
export function checkCoupon(db, coupon, { subtotalCents, userId, email }) {
  if (!coupon || !coupon.active) throw badRequest('That code is not valid.');
  if (coupon.expires_at && coupon.expires_at < new Date().toISOString()) throw badRequest('That code has expired.');
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) throw badRequest('That code has been fully redeemed.');
  if (subtotalCents < coupon.min_subtotal_cents) {
    throw badRequest(`Spend $${(coupon.min_subtotal_cents / 100).toFixed(0)} or more to use ${coupon.code}.`);
  }
  if (coupon.per_user_once) {
    const used = db.one(
      "SELECT 1 FROM orders WHERE coupon_code = ? AND status != 'cancelled' AND (email = ? OR (user_id IS NOT NULL AND user_id = ?)) LIMIT 1",
      coupon.code, email || '', userId || -1,
    );
    if (used) throw badRequest(`${coupon.code} can only be used once per customer.`);
  }
}

export function couponSummary(c) {
  return c && { code: c.code, description: c.description, type: c.type, value: c.value };
}

/**
 * Server-side price quote. The client's prices are never trusted — every line
 * is re-priced from the database and checked against live stock.
 */
export function quote(db, cfg, { items, couponCode, shippingMethod = 'standard', userId = null, email = '' }) {
  if (!Array.isArray(items) || items.length === 0) throw badRequest('Your cart is empty.');
  const merged = new Map();
  for (const it of items) {
    const key = `${it.productId}::${it.color || ''}`;
    const prev = merged.get(key);
    merged.set(key, { productId: it.productId, color: it.color || null, quantity: (prev?.quantity || 0) + it.quantity });
  }

  const lines = [];
  const problems = [];
  const wanted = new Map();
  for (const it of merged.values()) {
    const row = db.one('SELECT * FROM products WHERE id = ? AND active = 1', it.productId);
    if (!row) { problems.push({ productId: it.productId, reason: 'unavailable' }); continue; }
    wanted.set(row.id, (wanted.get(row.id) || 0) + it.quantity);
    const data = JSON.parse(row.data);
    lines.push({
      productId: row.id,
      name: row.name,
      color: it.color,
      image: data.images?.[0] || null,
      unitPriceCents: row.price_cents,
      quantity: it.quantity,
      lineCents: row.price_cents * it.quantity,
      stock: row.stock,
    });
  }
  for (const [id, qty] of wanted) {
    const stock = lines.find((l) => l.productId === id).stock;
    if (qty > stock) problems.push({ productId: id, reason: stock === 0 ? 'sold-out' : 'insufficient-stock', available: stock });
  }

  const subtotal = lines.reduce((s, l) => s + l.lineCents, 0);
  let coupon = null;
  let discount = 0;
  let shipping = shippingMethod === 'express'
    ? cfg.pricing.expressShippingCents
    : subtotal >= cfg.pricing.freeShippingOverCents ? 0 : cfg.pricing.standardShippingCents;

  if (couponCode) {
    coupon = findCoupon(db, couponCode);
    checkCoupon(db, coupon, { subtotalCents: subtotal, userId, email });
    if (coupon.type === 'percent') discount = Math.round((subtotal * coupon.value) / 100);
    else if (coupon.type === 'fixed') discount = Math.min(subtotal, coupon.value);
    else if (coupon.type === 'shipping') shipping = 0;
  }
  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round(taxable * cfg.pricing.taxRate);
  return {
    lines,
    problems,
    coupon,
    subtotalCents: subtotal,
    discountCents: discount,
    shippingCents: shipping,
    taxCents: tax,
    totalCents: taxable + shipping + tax,
  };
}

export const quoteJson = (q) => ({
  items: q.lines.map(({ stock, ...l }) => ({ ...l, unitPrice: l.unitPriceCents / 100, available: stock })),
  problems: q.problems,
  coupon: couponSummary(q.coupon),
  subtotal: q.subtotalCents / 100,
  discount: q.discountCents / 100,
  shipping: q.shippingCents / 100,
  tax: q.taxCents / 100,
  total: q.totalCents / 100,
});

/* ------------------------------------------------------------------- orders */

export const ORDER_FLOW = {
  pending: ['paid', 'processing', 'cancelled'],
  paid: ['processing', 'cancelled', 'refunded'],
  processing: ['shipped', 'cancelled', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};
export const ORDER_STATUSES = Object.keys(ORDER_FLOW);

function orderNumber() {
  const d = new Date();
  const ymd = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand = [...crypto.randomBytes(5)].map((b) => alphabet[b % alphabet.length]).join('');
  return `NV-${ymd}-${rand}`;
}

/** Demo payment gateway. Card numbers never reach the server — only the last 4. */
function charge({ method, last4 }, totalCents) {
  if (method === 'cod') return { status: 'unpaid', ref: null };
  if (method === 'card' && last4 === '0002') throw new HttpError(402, 'Your card was declined. Try a different card.');
  if (method === 'card' && last4 === '9995') throw new HttpError(402, 'Insufficient funds on this card.');
  return { status: 'paid', ref: `demo_${crypto.randomBytes(6).toString('hex')}_${totalCents}` };
}

/** What an idempotency key promises: same buyer, same cart, same code. */
function fingerprint(input, user) {
  const items = [...input.items].map((i) => `${i.productId}|${i.color || ''}|${i.quantity}`).sort().join(',');
  return crypto.createHash('sha256')
    .update(JSON.stringify([user?.id || null, String(input.email).toLowerCase(), items, (input.couponCode || '').toUpperCase(), input.payment?.method]))
    .digest('hex');
}

export function placeOrder(db, cfg, input, { user, hub, mailer }) {
  const fp = input.idempotencyKey ? fingerprint(input, user) : null;
  if (input.idempotencyKey) {
    const existing = db.one('SELECT number, idempotency_fp FROM orders WHERE idempotency_key = ?', input.idempotencyKey);
    if (existing) {
      // a replay of the very same request gets its order back; anything else is refused
      if (existing.idempotency_fp !== fp) throw conflict('This checkout was already submitted with different details. Refresh the page and try again.');
      return getOrder(db, existing.number);
    }
  }

  const result = db.tx(() => {
    const q = quote(db, cfg, { ...input, userId: user?.id, email: input.email });
    if (q.problems.length) throw conflict('Some items in your cart changed. Please review them.', { problems: q.problems });

    for (const l of q.lines) {
      const r = db.run('UPDATE products SET stock = stock - ?, updated_at = strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\') WHERE id = ? AND stock >= ?',
        l.quantity, l.productId, l.quantity);
      if (r.changes === 0) throw conflict(`${l.name} just sold out.`, { problems: [{ productId: l.productId, reason: 'sold-out' }] });
    }
    if (q.coupon) {
      const r = db.run('UPDATE coupons SET used_count = used_count + 1 WHERE code = ? AND (max_uses IS NULL OR used_count < max_uses)', q.coupon.code);
      if (r.changes === 0) throw badRequest('That code has been fully redeemed.');
    }

    const pay = charge(input.payment, q.totalCents);
    const status = pay.status === 'paid' ? 'paid' : 'pending';
    const number = orderNumber();
    const { id } = db.run(
      `INSERT INTO orders (number, user_id, email, status, payment_method, payment_status, payment_ref,
         subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents, coupon_code, shipping_method,
         shipping_address, notes, idempotency_key, idempotency_fp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      number, user?.id || null, input.email, status, input.payment.method, pay.status, pay.ref,
      q.subtotalCents, q.discountCents, q.shippingCents, q.taxCents, q.totalCents, q.coupon?.code || null,
      input.shippingMethod || 'standard', JSON.stringify(input.address), input.notes || '', input.idempotencyKey || null, fp,
    );
    for (const l of q.lines) {
      db.run('INSERT INTO order_items (order_id, product_id, name, color, image, unit_price_cents, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)',
        id, l.productId, l.name, l.color, l.image, l.unitPriceCents, l.quantity);
    }
    db.run('INSERT INTO order_events (order_id, status, note) VALUES (?, ?, ?)', id, 'placed', 'Order placed');
    if (status === 'paid') db.run('INSERT INTO order_events (order_id, status, note) VALUES (?, ?, ?)', id, 'paid', `Payment captured (${input.payment.method})`);
    if (user) db.run("UPDATE carts SET items = '[]', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE user_id = ?", user.id);
    return { number, lines: q.lines };
  });

  const order = getOrder(db, result.number);
  for (const l of result.lines) {
    const p = db.one('SELECT stock FROM products WHERE id = ?', l.productId);
    hub?.send('stock', { id: l.productId, stockCount: p.stock });
  }
  hub?.send('order:new', { number: order.number, total: order.total, email: order.email }, 'admins');
  mailer?.send(order.email, `Order ${order.number} confirmed`, orderEmail(order), 'order-confirmation');
  return order;
}

function orderEmail(o) {
  const lines = o.items.map((i) => `  ${i.quantity} × ${i.name}${i.color ? ` (${i.color})` : ''} — $${(i.unitPrice * i.quantity).toFixed(2)}`).join('\n');
  return `Thanks for your order!\n\nOrder ${o.number}\n${lines}\n\nSubtotal $${o.subtotal.toFixed(2)}\n${o.discount ? `Discount -$${o.discount.toFixed(2)}\n` : ''}Shipping $${o.shipping.toFixed(2)}\nTax $${o.tax.toFixed(2)}\nTotal $${o.total.toFixed(2)}\n\nTrack it any time at /track/${o.number}`;
}

export function getOrder(db, number) {
  const o = db.one('SELECT * FROM orders WHERE number = ?', number);
  if (!o) return null;
  const items = db.all('SELECT * FROM order_items WHERE order_id = ? ORDER BY id', o.id);
  const events = db.all('SELECT status, note, actor, created_at FROM order_events WHERE order_id = ? ORDER BY id', o.id);
  return {
    number: o.number,
    userId: o.user_id,
    email: o.email,
    status: o.status,
    paymentMethod: o.payment_method,
    paymentStatus: o.payment_status,
    subtotal: o.subtotal_cents / 100,
    discount: o.discount_cents / 100,
    shipping: o.shipping_cents / 100,
    tax: o.tax_cents / 100,
    total: o.total_cents / 100,
    couponCode: o.coupon_code,
    shippingMethod: o.shipping_method,
    address: JSON.parse(o.shipping_address),
    trackingNumber: o.tracking_number,
    notes: o.notes,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    items: items.map((i) => ({
      productId: i.product_id, name: i.name, color: i.color, image: i.image,
      unitPrice: i.unit_price_cents / 100, quantity: i.quantity,
    })),
    timeline: events.map((e) => ({ status: e.status, note: e.note, actor: e.actor, at: e.created_at })),
  };
}

/** Move an order through its lifecycle; cancelling puts stock back. */
export function transitionOrder(db, number, to, { actor = 'system', note = '', trackingNumber, hub, mailer } = {}) {
  const o = db.one('SELECT * FROM orders WHERE number = ?', number);
  if (!o) throw notFound('Order not found.');
  if (o.status === to) return getOrder(db, number);
  if (!ORDER_FLOW[o.status]?.includes(to)) throw badRequest(`An order that is ${o.status} can't become ${to}.`);

  const restocked = [];
  // goods come back to the shelf if they never left the warehouse
  const restock = to === 'cancelled' || (to === 'refunded' && ['paid', 'processing'].includes(o.status));
  // money that was taken is given back (demo gateway: just record it)
  const payment = to === 'refunded' || (to === 'cancelled' && o.payment_status === 'paid') ? 'refunded'
    : to === 'paid' || (to === 'delivered' && o.payment_method === 'cod') ? 'paid' : o.payment_status;
  db.tx(() => {
    db.run(`UPDATE orders SET status = ?, tracking_number = COALESCE(?, tracking_number), payment_status = ?,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
      to, trackingNumber || null, payment, o.id);
    db.run('INSERT INTO order_events (order_id, status, note, actor) VALUES (?, ?, ?, ?)', o.id, to, note, actor);
    if (payment === 'refunded' && o.payment_status === 'paid') {
      db.run('INSERT INTO order_events (order_id, status, note, actor) VALUES (?, ?, ?, ?)', o.id, 'refund', `Refunded $${(o.total_cents / 100).toFixed(2)} to ${o.payment_method}`, actor);
    }
    if (restock) {
      for (const it of db.all('SELECT product_id, quantity FROM order_items WHERE order_id = ?', o.id)) {
        db.run('UPDATE products SET stock = stock + ? WHERE id = ?', it.quantity, it.product_id);
        restocked.push(it.product_id);
      }
      if (to === 'cancelled' && o.coupon_code) db.run('UPDATE coupons SET used_count = MAX(0, used_count - 1) WHERE code = ?', o.coupon_code);
    }
  });

  const order = getOrder(db, number);
  for (const id of restocked) {
    const p = db.one('SELECT stock FROM products WHERE id = ?', id);
    if (p) hub?.send('stock', { id, stockCount: p.stock });
  }
  hub?.send('order', { number, status: to, trackingNumber: order.trackingNumber }, o.user_id ? { userId: o.user_id } : 'admins');
  const label = { paid: 'payment received', processing: 'is being prepared', shipped: 'has shipped', delivered: 'was delivered', cancelled: 'was cancelled', refunded: 'was refunded' }[to];
  if (label) mailer?.send(o.email, `Order ${number} ${label}`, `Your order ${number} ${label}.${order.trackingNumber ? `\nTracking: ${order.trackingNumber}` : ''}\n\nTrack it at /track/${number}`, `order-${to}`);
  return order;
}

/** Tell everyone waiting on a product that it's back. */
export async function notifyBackInStock(db, productId, mailer) {
  const p = db.one('SELECT name, stock FROM products WHERE id = ?', productId);
  if (!p || p.stock <= 0) return 0;
  const rows = db.all('SELECT email FROM stock_alerts WHERE product_id = ?', productId);
  for (const r of rows) await mailer.send(r.email, `${p.name} is back in the vault`, `${p.name} is back in stock — only ${p.stock} available.\n\n/product/${productId}`, 'back-in-stock');
  db.run('DELETE FROM stock_alerts WHERE product_id = ?', productId);
  return rows.length;
}
