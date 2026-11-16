import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, seed } from '../db.js';
import { createApp } from '../app.js';
import { config as baseConfig } from '../config.js';
import { log } from '../lib/log.js';

let server, base, db, adminPass;
const config = { ...baseConfig, cookieSecure: false, authRateLimit: 1000, orderRateLimit: 1000 };

before(async () => {
  db = openDb(':memory:');
  adminPass = (await seed(db, { adminEmail: 'admin@test.local', adminPassword: 'Admin12345', log: log.quiet })).adminPassword || 'Admin12345';
  const { app } = createApp({ db, config, log: log.quiet });
  await new Promise((r) => { server = app.listen(0, '127.0.0.1', r); });
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => { server.close(); db.close(); });

/** Tiny client with its own cookie jar, like one browser. */
function client() {
  let cookie = '';
  return async (method, path, body, headers = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'content-type': 'application/json', 'x-requested-with': 'neonvault', ...(cookie ? { cookie } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0];
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* csv etc */ }
    return { status: res.status, body: json, text };
  };
}

const address = { firstName: 'Ada', lastName: 'Lovelace', line1: '12 Circuit Road', city: 'Dhaka', state: 'DH', zip: '1212', country: 'BD', phone: '+8801700000000' };
const stock = (id) => db.one('SELECT stock FROM products WHERE id = ?', id).stock;

test('catalog lists seeded products with server prices', async () => {
  const c = client();
  const r = await c('GET', '/products');
  assert.equal(r.status, 200);
  assert.ok(r.body.count >= 18);
  const void_ = r.body.products.find((p) => p.id === 'void-keyboard');
  assert.equal(void_.price, 279);
  assert.equal(typeof void_.stockCount, 'number');
});

test('state-changing calls without the CSRF header are rejected', async () => {
  const res = await fetch(`${base}/newsletter`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"email":"x@y.co"}' });
  assert.equal(res.status, 403);
});

test('register → me → logout → login, with validation', async () => {
  const c = client();
  let r = await c('POST', '/auth/register', { email: 'bad', password: 'short', firstName: '', lastName: 'X' });
  assert.equal(r.status, 400);
  assert.ok(r.body.details.fields.email && r.body.details.fields.password);

  r = await c('POST', '/auth/register', { email: 'Neo@Example.com', password: 'matrix123', firstName: 'Neo', lastName: 'Anderson' });
  assert.equal(r.status, 201);
  assert.equal(r.body.user.email, 'neo@example.com');
  r = await c('GET', '/auth/me');
  assert.equal(r.body.user.firstName, 'Neo');

  r = await c('POST', '/auth/register', { email: 'neo@example.com', password: 'matrix123', firstName: 'Neo', lastName: 'A' });
  assert.equal(r.status, 409);

  await c('POST', '/auth/logout');
  r = await c('GET', '/auth/me');
  assert.equal(r.body.user, null);
  r = await c('POST', '/auth/login', { email: 'neo@example.com', password: 'wrongpass1' });
  assert.equal(r.status, 401);
  r = await c('POST', '/auth/login', { email: 'NEO@example.com', password: 'matrix123' });
  assert.equal(r.status, 200);
});

test('password is stored hashed, never in plain text', () => {
  const u = db.one("SELECT password_hash FROM users WHERE email = 'neo@example.com'");
  assert.match(u.password_hash, /^scrypt\$/);
  assert.ok(!u.password_hash.includes('matrix123'));
});

test('repeated failed logins lock the email for a while', async () => {
  const c = client();
  await c('POST', '/auth/register', { email: 'lock@example.com', password: 'secret123', firstName: 'L', lastName: 'K' });
  const c2 = client();
  for (let i = 0; i < 5; i++) await c2('POST', '/auth/login', { email: 'lock@example.com', password: 'nope12345' });
  const r = await c2('POST', '/auth/login', { email: 'lock@example.com', password: 'secret123' });
  assert.equal(r.status, 429);
});

test('guest checkout re-prices on the server, decrements stock and emails', async () => {
  const c = client();
  const before = stock('void-keyboard');
  const r = await c('POST', '/orders', {
    email: 'guest@example.com', address,
    items: [{ productId: 'void-keyboard', color: 'Obsidian', quantity: 2, price: 1 }],
    payment: { method: 'card', last4: '4242' },
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const o = r.body.order;
  assert.equal(o.subtotal, 558); // 2 × 279 — the client's "price: 1" is ignored
  assert.equal(o.shipping, 0); // over $200
  assert.equal(o.tax, 44.64);
  assert.equal(o.total, 602.64);
  assert.equal(o.status, 'paid');
  assert.equal(stock('void-keyboard'), before - 2);
  assert.ok(db.one("SELECT 1 FROM emails WHERE kind = 'order-confirmation' AND to_addr = 'guest@example.com'"));
});

test('declined card rolls everything back', async () => {
  const c = client();
  const before = stock('arc-mouse');
  const r = await c('POST', '/orders', { email: 'd@example.com', address, items: [{ productId: 'arc-mouse', quantity: 1 }], payment: { method: 'card', last4: '0002' } });
  assert.equal(r.status, 402);
  assert.equal(stock('arc-mouse'), before);
  assert.equal(db.one("SELECT COUNT(*) n FROM orders WHERE email = 'd@example.com'").n, 0);
});

test('cannot buy more than is in stock', async () => {
  db.run("UPDATE products SET stock = 1 WHERE id = 'pulse-ring'");
  const c = client();
  const r = await c('POST', '/orders', { email: 'o@example.com', address, items: [{ productId: 'pulse-ring', quantity: 2 }], payment: { method: 'cod' } });
  assert.equal(r.status, 409);
  assert.equal(r.body.details.problems[0].reason, 'insufficient-stock');
  assert.equal(stock('pulse-ring'), 1);
});

test('idempotency key prevents double orders on double-click', async () => {
  const c = client();
  const body = { email: 'idem@example.com', address, items: [{ productId: 'nx1-headphones', quantity: 1 }], payment: { method: 'cod' }, idempotencyKey: 'abc12345-xyz' };
  const [a, b] = await Promise.all([c('POST', '/orders', body), c('POST', '/orders', body)]);
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  assert.equal(a.body.order.number, b.body.order.number);
  assert.equal(db.one("SELECT COUNT(*) n FROM orders WHERE email = 'idem@example.com'").n, 1);
});

test('coupons: percent, minimum spend, once-per-customer', async () => {
  const c = client();
  let r = await c('POST', '/cart/quote', { items: [{ productId: 'void-keyboard', quantity: 1 }], couponCode: 'VAULT10' });
  assert.equal(r.body.discount, 27.9);
  r = await c('POST', '/coupons/validate', { code: 'NEON50', subtotal: 100 });
  assert.equal(r.status, 400);
  r = await c('POST', '/coupons/validate', { code: 'nope', subtotal: 100 });
  assert.equal(r.status, 400);
  const order = { email: 'w@example.com', address, items: [{ productId: 'void-keyboard', quantity: 1 }], payment: { method: 'cod' }, couponCode: 'WELCOME15' };
  r = await c('POST', '/orders', order);
  assert.equal(r.status, 201);
  assert.equal(r.body.order.discount, 41.85);
  r = await c('POST', '/orders', order);
  assert.equal(r.status, 400);
});

test('order tracking needs the matching email; cancel restocks', async () => {
  const c = client();
  const before = stock('apex-earbuds');
  const { body } = await c('POST', '/orders', { email: 't@example.com', address, items: [{ productId: 'apex-earbuds', quantity: 1 }], payment: { method: 'cod' } });
  const n = body.order.number;
  assert.equal((await client()('GET', `/orders/${n}?email=wrong@example.com`)).status, 404);
  assert.equal((await client()('GET', `/orders/${n}?email=T@example.com`)).status, 200);
  const r = await client()('POST', `/orders/${n}/cancel`, { email: 't@example.com' });
  assert.equal(r.body.order.status, 'cancelled');
  assert.equal(stock('apex-earbuds'), before);
});

test('admin API is closed to customers and open to admins', async () => {
  const cust = client();
  await cust('POST', '/auth/register', { email: 'c2@example.com', password: 'secret123', firstName: 'C', lastName: 'Two' });
  assert.equal((await cust('GET', '/admin/stats')).status, 403);
  assert.equal((await client()('GET', '/admin/stats')).status, 401);

  const admin = client();
  assert.equal((await admin('POST', '/auth/login', { email: 'admin@test.local', password: adminPass })).status, 200);
  const s = await admin('GET', '/admin/stats');
  assert.equal(s.status, 200);
  assert.ok(s.body.orders.month >= 1);
  assert.equal(s.body.series.length, 14);
});

test('order lifecycle: illegal jumps refused, shipping needs tracking', async () => {
  const admin = client();
  await admin('POST', '/auth/login', { email: 'admin@test.local', password: adminPass });
  const { body } = await client()('POST', '/orders', { email: 'life@example.com', address, items: [{ productId: 'orbit-controller', quantity: 1 }], payment: { method: 'card', last4: '4242' } });
  const n = body.order.number;
  assert.equal((await admin('PATCH', `/admin/orders/${n}`, { status: 'delivered' })).status, 400);
  assert.equal((await admin('PATCH', `/admin/orders/${n}`, { status: 'processing' })).status, 200);
  assert.equal((await admin('PATCH', `/admin/orders/${n}`, { status: 'shipped' })).status, 400);
  const r = await admin('PATCH', `/admin/orders/${n}`, { status: 'shipped', trackingNumber: 'DHL-123' });
  assert.equal(r.body.order.status, 'shipped');
  assert.deepEqual(r.body.order.timeline.map((e) => e.status), ['placed', 'paid', 'processing', 'shipped']);
});

test('reviews: sign-in required, verified after purchase, updates rating', async () => {
  const c = client();
  assert.equal((await c('POST', '/products/prism-dac/reviews', { rating: 5, body: 'Great DAC for the price.' })).status, 400);
  await c('POST', '/auth/register', { email: 'rev@example.com', password: 'secret123', firstName: 'Rae', lastName: 'View' });
  await c('POST', '/orders', { email: 'rev@example.com', address, items: [{ productId: 'prism-dac', quantity: 1 }], payment: { method: 'card', last4: '4242' } });
  const r = await c('POST', '/products/prism-dac/reviews', { rating: 1, body: 'Honest test review body.' });
  assert.equal(r.status, 201);
  assert.equal(r.body.verified, true);
  const list = await c('GET', '/products/prism-dac/reviews');
  assert.equal(list.body.reviews[0].author, 'Rae V.');
});

test('guest cart and wishlist merge into the account on sign-in', async () => {
  const c = client();
  await c('POST', '/auth/register', {
    email: 'merge@example.com', password: 'secret123', firstName: 'M', lastName: 'G',
    guest: { cart: [{ productId: 'flux-monitor', quantity: 2 }], wishlist: ['nexus-hub', 'does-not-exist'] },
  });
  assert.equal((await c('GET', '/me/cart')).body.items[0].quantity, 2);
  const w = await c('GET', '/me/wishlist');
  assert.deepEqual(w.body.items.map((p) => p.id), ['nexus-hub']);
});

test('admin restock emails everyone waiting for it', async () => {
  db.run("UPDATE products SET stock = 0 WHERE id = 'sentinel-lock'");
  await client()('POST', '/products/sentinel-lock/notify', { email: 'wait@example.com' });
  const admin = client();
  await admin('POST', '/auth/login', { email: 'admin@test.local', password: adminPass });
  const r = await admin('PATCH', '/admin/products/sentinel-lock', { stock: 5 });
  assert.equal(r.body.notified, 1);
  assert.ok(db.one("SELECT 1 FROM emails WHERE kind = 'back-in-stock' AND to_addr = 'wait@example.com'"));
});

test('CSV export neutralises spreadsheet formulas', async () => {
  await client()('POST', '/newsletter', { email: 'evil@example.com', source: '=HYPERLINK("x")' });
  const admin = client();
  await admin('POST', '/auth/login', { email: 'admin@test.local', password: adminPass });
  const r = await admin('GET', '/admin/subscribers.csv');
  assert.ok(r.text.includes(`"'=HYPERLINK(""x"")"`));
});

test('password reset: same answer for unknown emails, one-time token', async () => {
  const c = client();
  await c('POST', '/auth/register', { email: 'forgot@example.com', password: 'oldpass123', firstName: 'F', lastName: 'G' });
  assert.equal((await client()('POST', '/auth/forgot', { email: 'nobody@example.com' })).status, 200);
  assert.equal((await client()('POST', '/auth/forgot', { email: 'forgot@example.com' })).status, 200);
  const mail = db.one("SELECT body FROM emails WHERE kind = 'password-reset' AND to_addr = 'forgot@example.com'");
  const token = mail.body.match(/token=([\w-]+)/)[1];
  const r = await client()('POST', '/auth/reset', { token, password: 'newpass456' });
  assert.equal(r.status, 200);
  assert.equal((await client()('POST', '/auth/reset', { token, password: 'again789x' })).status, 400);
  assert.equal((await client()('POST', '/auth/login', { email: 'forgot@example.com', password: 'newpass456' })).status, 200);
  // the old session was revoked
  assert.equal((await c('GET', '/auth/me')).body.user, null);
});

test('admin can download a database backup', async () => {
  const admin = client();
  await admin('POST', '/auth/login', { email: 'admin@test.local', password: adminPass });
  const res = await fetch(`${base}/admin/backup`, { headers: { cookie: '' } });
  assert.equal(res.status, 401);
});

test('review fixes: guest orders are not auto-attached; claiming needs the order number', async () => {
  const { body } = await client()('POST', '/orders', { email: 'victim@example.com', address, items: [{ productId: 'zenith-mousepad', quantity: 1 }], payment: { method: 'cod' } });
  const attacker = client();
  await attacker('POST', '/auth/register', { email: 'victim@example.com', password: 'attack123', firstName: 'A', lastName: 'X' });
  assert.equal((await attacker('GET', '/me/orders')).body.orders.length, 0);
  assert.equal((await attacker('POST', `/orders/${body.order.number}/cancel`, {})).status, 404);
  // the real owner, knowing the number, can claim it
  assert.equal((await attacker('POST', '/me/orders/claim', { number: 'NV-000000-XXXXX' })).status, 404);
  assert.equal((await attacker('POST', '/me/orders/claim', { number: body.order.number })).status, 200);
});

test('review fixes: reset link ignores the Origin header', async () => {
  await client()('POST', '/auth/register', { email: 'origin@example.com', password: 'secret123', firstName: 'O', lastName: 'R' });
  await client()('POST', '/auth/forgot', { email: 'origin@example.com' }, { origin: 'https://evil.example' });
  const mail = db.one("SELECT body FROM emails WHERE kind = 'password-reset' AND to_addr = 'origin@example.com'");
  assert.ok(!mail.body.includes('evil.example'));
  assert.ok(mail.body.includes(`${config.publicUrl}/reset-password?token=`));
});

test('review fixes: parallel wrong logins hit the lockout', async () => {
  await client()('POST', '/auth/register', { email: 'burst@example.com', password: 'secret123', firstName: 'B', lastName: 'U' });
  const results = await Promise.all(Array.from({ length: 20 }, () => client()('POST', '/auth/login', { email: 'burst@example.com', password: 'wrong1234' })));
  assert.ok(results.filter((r) => r.status === 429).length >= 15);
});

test('review fixes: idempotency key bound to the request', async () => {
  const c = client();
  const body = { email: 'k1@example.com', address, items: [{ productId: 'nexus-hub', quantity: 1 }], payment: { method: 'cod' }, idempotencyKey: 'same-key-123' };
  assert.equal((await c('POST', '/orders', body)).status, 201);
  assert.equal((await c('POST', '/orders', body)).status, 201);
  const other = await client()('POST', '/orders', { ...body, email: 'k2@example.com' });
  assert.equal(other.status, 409);
  assert.ok(!JSON.stringify(other.body).includes('k1@example.com'));
});

test('review fixes: cancel refunds a paid order, early refund restocks', async () => {
  const admin = client();
  await admin('POST', '/auth/login', { email: 'admin@test.local', password: adminPass });
  const before = stock('core-dock');
  const a = (await client()('POST', '/orders', { email: 'r1@example.com', address, items: [{ productId: 'core-dock', quantity: 2 }], payment: { method: 'card', last4: '4242' } })).body.order;
  const cancelled = (await client()('POST', `/orders/${a.number}/cancel`, { email: 'r1@example.com' })).body.order;
  assert.equal(cancelled.paymentStatus, 'refunded');
  const b = (await client()('POST', '/orders', { email: 'r2@example.com', address, items: [{ productId: 'core-dock', quantity: 1 }], payment: { method: 'card', last4: '4242' } })).body.order;
  await admin('PATCH', `/admin/orders/${b.number}`, { status: 'refunded' });
  assert.equal(stock('core-dock'), before);
});

test('review fixes: malformed foreign cookie does not break the API', async () => {
  const res = await fetch(`${base}/auth/me`, { headers: { cookie: 'other=%E0%A4%A; nv_sid=bogus' } });
  assert.equal(res.status, 200);
});

test('review fixes: admin stock edit refuses stale values', async () => {
  const admin = client();
  await admin('POST', '/auth/login', { email: 'admin@test.local', password: adminPass });
  const cur = stock('echo-speakers');
  assert.equal((await admin('PATCH', '/admin/products/echo-speakers', { stock: 50, expectedStock: cur + 3 })).status, 409);
  assert.equal((await admin('PATCH', '/admin/products/echo-speakers', { stock: 50, expectedStock: cur })).status, 200);
});
