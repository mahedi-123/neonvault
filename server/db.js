import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
import { ROOT } from './config.js';
import { hashPassword } from './lib/auth.js';

/**
 * SQLite through Node's built-in driver (node:sqlite) — no native modules to
 * compile, so `npm install` just works on Windows. Every write that touches
 * money or stock runs inside tx() so a failure leaves nothing half-done.
 */
export function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

  db.one = (sql, ...p) => db.prepare(sql).get(...p);
  db.all = (sql, ...p) => db.prepare(sql).all(...p);
  db.run = (sql, ...p) => {
    const r = db.prepare(sql).run(...p);
    return { changes: Number(r.changes), id: Number(r.lastInsertRowid) };
  };
  let depth = 0;
  db.tx = (fn) => {
    if (depth > 0) return fn();
    db.exec('BEGIN IMMEDIATE');
    depth++;
    try {
      const out = fn();
      db.exec('COMMIT');
      return out;
    } catch (e) {
      try { db.exec('ROLLBACK'); } catch { /* already rolled back */ }
      throw e;
    } finally {
      depth--;
    }
  };
  migrate(db);
  return db;
}

const MIGRATIONS = [
  `CREATE TABLE users (
     id INTEGER PRIMARY KEY,
     email TEXT NOT NULL UNIQUE COLLATE NOCASE,
     password_hash TEXT NOT NULL,
     first_name TEXT NOT NULL DEFAULT '',
     last_name TEXT NOT NULL DEFAULT '',
     phone TEXT NOT NULL DEFAULT '',
     role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
     marketing_opt_in INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     last_login_at TEXT
   );
   CREATE TABLE sessions (
     id TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     expires_at TEXT NOT NULL,
     user_agent TEXT, ip TEXT
   );
   CREATE INDEX idx_sessions_user ON sessions(user_id);
   CREATE TABLE addresses (
     id INTEGER PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     label TEXT NOT NULL DEFAULT 'Home',
     first_name TEXT NOT NULL, last_name TEXT NOT NULL,
     line1 TEXT NOT NULL, line2 TEXT NOT NULL DEFAULT '',
     city TEXT NOT NULL, state TEXT NOT NULL DEFAULT '', zip TEXT NOT NULL DEFAULT '',
     country TEXT NOT NULL DEFAULT 'US', phone TEXT NOT NULL DEFAULT '',
     is_default INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
   );
   CREATE TABLE products (
     id TEXT PRIMARY KEY,
     name TEXT NOT NULL,
     category TEXT NOT NULL,
     price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
     original_price_cents INTEGER,
     stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
     active INTEGER NOT NULL DEFAULT 1,
     sort INTEGER NOT NULL DEFAULT 0,
     seed_rating REAL NOT NULL DEFAULT 0,
     seed_review_count INTEGER NOT NULL DEFAULT 0,
     data TEXT NOT NULL,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
   );
   CREATE INDEX idx_products_category ON products(category);
   CREATE TABLE wishlist (
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     PRIMARY KEY (user_id, product_id)
   );
   CREATE TABLE carts (
     user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
     items TEXT NOT NULL DEFAULT '[]',
     updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
   );
   CREATE TABLE coupons (
     code TEXT PRIMARY KEY COLLATE NOCASE,
     description TEXT NOT NULL DEFAULT '',
     type TEXT NOT NULL CHECK (type IN ('percent','fixed','shipping')),
     value INTEGER NOT NULL DEFAULT 0,
     min_subtotal_cents INTEGER NOT NULL DEFAULT 0,
     max_uses INTEGER,
     used_count INTEGER NOT NULL DEFAULT 0,
     per_user_once INTEGER NOT NULL DEFAULT 0,
     expires_at TEXT,
     active INTEGER NOT NULL DEFAULT 1,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
   );
   CREATE TABLE orders (
     id INTEGER PRIMARY KEY,
     number TEXT NOT NULL UNIQUE,
     user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
     email TEXT NOT NULL COLLATE NOCASE,
     status TEXT NOT NULL,
     payment_method TEXT NOT NULL,
     payment_status TEXT NOT NULL,
     payment_ref TEXT,
     subtotal_cents INTEGER NOT NULL,
     discount_cents INTEGER NOT NULL DEFAULT 0,
     shipping_cents INTEGER NOT NULL DEFAULT 0,
     tax_cents INTEGER NOT NULL DEFAULT 0,
     total_cents INTEGER NOT NULL,
     coupon_code TEXT,
     shipping_method TEXT NOT NULL DEFAULT 'standard',
     shipping_address TEXT NOT NULL,
     tracking_number TEXT,
     notes TEXT NOT NULL DEFAULT '',
     idempotency_key TEXT UNIQUE,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
   );
   CREATE INDEX idx_orders_user ON orders(user_id);
   CREATE INDEX idx_orders_email ON orders(email);
   CREATE INDEX idx_orders_created ON orders(created_at);
   CREATE TABLE order_items (
     id INTEGER PRIMARY KEY,
     order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
     product_id TEXT NOT NULL,
     name TEXT NOT NULL,
     color TEXT,
     image TEXT,
     unit_price_cents INTEGER NOT NULL,
     quantity INTEGER NOT NULL CHECK (quantity > 0)
   );
   CREATE INDEX idx_items_order ON order_items(order_id);
   CREATE INDEX idx_items_product ON order_items(product_id);
   CREATE TABLE order_events (
     id INTEGER PRIMARY KEY,
     order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
     status TEXT NOT NULL,
     note TEXT NOT NULL DEFAULT '',
     actor TEXT NOT NULL DEFAULT 'system',
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
   );
   CREATE TABLE reviews (
     id INTEGER PRIMARY KEY,
     product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
     user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
     author TEXT NOT NULL,
     rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
     title TEXT NOT NULL DEFAULT '',
     body TEXT NOT NULL DEFAULT '',
     verified INTEGER NOT NULL DEFAULT 0,
     hidden INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     UNIQUE (product_id, user_id)
   );
   CREATE TABLE subscribers (
     email TEXT PRIMARY KEY COLLATE NOCASE,
     source TEXT NOT NULL DEFAULT 'footer',
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
   );
   CREATE TABLE stock_alerts (
     email TEXT NOT NULL COLLATE NOCASE,
     product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
     PRIMARY KEY (email, product_id)
   );
   CREATE TABLE messages (
     id INTEGER PRIMARY KEY,
     name TEXT NOT NULL, email TEXT NOT NULL, subject TEXT NOT NULL DEFAULT '', body TEXT NOT NULL,
     handled INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
   );
   CREATE TABLE emails (
     id INTEGER PRIMARY KEY,
     to_addr TEXT NOT NULL, subject TEXT NOT NULL, body TEXT NOT NULL, kind TEXT NOT NULL,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
   );
   CREATE TABLE audit_log (
     id INTEGER PRIMARY KEY,
     user_id INTEGER, action TEXT NOT NULL, target TEXT NOT NULL DEFAULT '', meta TEXT NOT NULL DEFAULT '{}',
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
   );
   CREATE TABLE analytics (
     id INTEGER PRIMARY KEY,
     type TEXT NOT NULL, product_id TEXT, template TEXT, path TEXT, session TEXT,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
   );
   CREATE INDEX idx_analytics_type ON analytics(type, created_at);`,
  `CREATE TABLE password_resets (
     id TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     expires_at TEXT NOT NULL,
     used INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
   );`,
  `ALTER TABLE orders ADD COLUMN idempotency_fp TEXT;`,
];

function migrate(db) {
  db.exec('CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
  const done = new Set(db.all('SELECT version FROM _migrations').map((r) => r.version));
  MIGRATIONS.forEach((sql, i) => {
    const v = i + 1;
    if (done.has(v)) return;
    db.tx(() => {
      db.exec(sql);
      db.run('INSERT INTO _migrations (version, applied_at) VALUES (?, ?)', v, new Date().toISOString());
    });
  });
}

/** Static catalog fields live in `data`; price, stock and rating are columns the API owns. */
const DYNAMIC = ['price', 'originalPrice', 'stockCount', 'inStock', 'rating', 'reviewCount'];

export async function seed(db, { adminEmail, adminPassword, log, demo = true } = {}) {
  const out = { adminPassword: null };
  const count = db.one('SELECT COUNT(*) n FROM products').n;
  if (count === 0) {
    const mod = await import(pathToFileURL(path.join(ROOT, 'src', 'shared', 'data', 'products.js')).href);
    db.tx(() => {
      mod.products.forEach((p, i) => {
        const data = { ...p };
        DYNAMIC.forEach((k) => delete data[k]);
        db.run(
          `INSERT INTO products (id, name, category, price_cents, original_price_cents, stock, sort, seed_rating, seed_review_count, data)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          p.id, p.name, p.category, Math.round(p.price * 100),
          p.originalPrice ? Math.round(p.originalPrice * 100) : null,
          p.inStock === false ? 0 : (p.stockCount ?? 25), i, p.rating || 0, p.reviewCount || 0, JSON.stringify(data),
        );
      });
    });
    log?.info(`Seeded ${mod.products.length} products.`);
  }

  if (demo && db.one('SELECT COUNT(*) n FROM coupons').n === 0) {
    const add = (code, description, type, value, min = 0, extra = {}) => db.run(
      'INSERT INTO coupons (code, description, type, value, min_subtotal_cents, max_uses, per_user_once) VALUES (?, ?, ?, ?, ?, ?, ?)',
      code, description, type, value, min, extra.maxUses ?? null, extra.once ? 1 : 0,
    );
    add('VAULT10', '10% off everything', 'percent', 10);
    add('NEON50', '$50 off orders over $400', 'fixed', 5000, 40000);
    add('FREESHIP', 'Free express shipping', 'shipping', 0);
    add('WELCOME15', '15% off your first order', 'percent', 15, 0, { once: true });
  }

  const admin = db.one("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (!admin) {
    const password = adminPassword || crypto.randomBytes(9).toString('base64url');
    db.run(
      "INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES (?, ?, 'Vault', 'Admin', 'admin')",
      adminEmail, await hashPassword(password),
    );
    out.adminPassword = adminPassword ? null : password;
  }
  return out;
}
