# NEONVAULT

A futuristic tech storefront with **four switchable designs** and a **full backend** (accounts, orders, payments flow, coupons, reviews, live stock, admin panel).

## Quick start

**Windows:** double-click `START-WINDOWS.bat`. It installs everything the first time, starts the store and opens it in your browser.

**Any OS:**

```bash
npm install
npm run dev        # store → http://localhost:5173   admin → http://localhost:5173/admin
```

Requires **Node 22.13+ or 24+** (the backend uses Node's built-in SQLite — nothing native to compile).

The first run creates the database (`server/data/neonvault.db`), loads the catalog and creates an admin account. The admin email and password are printed in the console and saved to `server/data/admin-login.txt`. Change the password in Admin → Settings.

## Designs

Pick one with the **Design** pill in the bottom-left corner (or **Alt+T**). The choice is remembered.

| id | Name | What it is |
|---|---|---|
| `original` | Original | The first NEONVAULT storefront |
| `vault` | Vault Tree | Vault theme, living tree, mycelium hero |
| `biome` | Biome (default) | Futuristic: GPU biome, orbit hero, command dock |
| `galaxy` | Galaxy | 3D Milky Way behind every page: scroll flies the camera from the outer rim to the core, the pointer bends starlight like a gravitational lens, clicks set off a supernova shockwave, every page change is a hyperspace jump |

All of them share the same catalog, cart, account and backend; only the look changes. Open one directly with `?template=vault`.

## What the backend does

- **Accounts** — sign up / sign in / sign out, scrypt-hashed passwords, httpOnly session cookies, forgot & reset password by email link, change password (signs out other devices), profile, saved addresses.
- **Cart & wishlist** — work for guests in the browser; when signed in they're stored on the account and follow you across devices. Guest items merge in on sign-in.
- **Checkout** — the server re-prices every item, checks live stock, applies coupons, computes shipping and tax, and places the order in one database transaction (stock can't oversell). Double-clicks can't create two orders (idempotency key).
- **Payments** — demo gateway: card (card numbers never reach the server, only the last 4), Cash on Delivery, PayPal, Apple Pay. Test cards: anything works; ending **0002** = declined, **9995** = insufficient funds. A declined payment rolls everything back.
- **Coupons** — percent, fixed amount, free shipping; minimum spend, usage limits, once-per-customer, expiry. Seeded: `VAULT10`, `NEON50` (over $400), `FREESHIP`, `WELCOME15` (first order).
- **Orders** — lifecycle pending → paid → processing → shipped → delivered (+ cancelled / refunded). Customers can cancel before it's prepared (stock is returned). Public tracking page `/track` with order number + email.
- **Reviews** — signed-in customers can review; buyers get a **Verified purchase** badge; ratings update live; admins can hide reviews.
- **Live updates** (Server-Sent Events) — stock levels, ratings and order status update on open pages without reloading.
- **Back-in-stock alerts** — sold-out products take an email; restocking in the admin emails everyone waiting.
- **Newsletter & contact form** — stored and visible in the admin.
- **Emails** — order confirmation, status changes, welcome, password reset, restock. They're stored in an outbox (Admin → Marketing) and printed in the console; plug a real provider into `server/lib/mailer.js` to deliver them.
- **Analytics** — first-party, cookie-free: visitors → cart → checkout → order funnel and which design people use.

## Admin panel (`/admin`)

Dashboard (revenue chart, KPIs, funnel, top products, low stock), Orders (filter, search, status changes with tracking numbers, timeline, CSV export), Products (edit price/stock inline, hide/show, add products), Coupons, Customers, Reviews moderation, Inbox, Marketing (subscribers + CSV, email outbox), Settings (password, database backup download, audit log). New orders and messages pop in live.

## Security

Session tokens are random and only their SHA-256 is stored · scrypt password hashing · per-IP rate limits plus per-email login lockout · CSRF protection (custom header + SameSite cookie) · strict input validation (zod) on every endpoint · prices and totals computed on the server only · CSV exports neutralise spreadsheet formulas · security headers · no account enumeration on password reset.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API + Vite dev server with hot reload |
| `npm run serve` | Production build, then one server for site + API on :8787 |
| `npm start` | Serve an existing build + API on :8787 |
| `npm test` | Backend integration tests |
| `npm run lint` | Lint |

## Deploying

```bash
npm ci && npm run build
NODE_ENV=production PORT=8787 COOKIE_SECURE=1 node server/index.js
```

Put it behind HTTPS (Caddy/Nginx). Environment variables: `PORT`, `HOST` (use `0.0.0.0` in containers), `DB_FILE`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `COOKIE_SECURE=1`, `SESSION_DAYS`, `LOW_STOCK`. Back up `server/data/` (or use Admin → Settings → Download backup).

## Project layout

```
server/             Express API (node:sqlite)
  routes/           public (catalog, checkout, tracking), account, admin
  lib/              auth, store (pricing & orders), security, live events, mailer
  test/             integration tests
src/
  main.jsx          picks the design, connects to the API, mounts
  shell/            design registry + switcher
  shared/           catalog, API client, cart/auth/wishlist, account, tracking, reviews
  templates/        original/ vault/ biome/ galaxy/ — one complete design each
  admin/            admin panel (admin.html)
```

Add a design: copy a folder in `src/templates/`, change it, and list it in `src/shell/templates.js`.
