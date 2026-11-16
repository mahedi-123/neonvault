import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { loadUser } from './lib/auth.js';
import { securityHeaders, csrfGuard, rateLimit } from './lib/security.js';
import { errorHandler, notFound } from './lib/http.js';
import { createHub } from './lib/events.js';
import { createMailer } from './lib/mailer.js';
import { publicRoutes } from './routes/public.js';
import { accountRoutes } from './routes/account.js';
import { adminRoutes } from './routes/admin.js';

/** Builds the Express app around an open database. Used by the server and the tests. */
export function createApp({ db, config, log, serveStatic = false }) {
  const hub = createHub();
  const mailer = createMailer(db, log);
  const ctx = { db, config, hub, mailer, log };

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');
  app.use(securityHeaders(config));

  const api = express.Router();
  api.use(express.json({ limit: '100kb' }));
  api.use(rateLimit({ windowMs: 60e3, max: 600 }));
  api.use(csrfGuard);
  api.use(loadUser(db));
  api.use(publicRoutes(ctx));
  api.use(accountRoutes(ctx));
  api.use('/admin', adminRoutes(ctx));
  api.use(() => { throw notFound('No such API route.'); });
  app.use('/api', api);

  if (serveStatic && fs.existsSync(config.distDir)) {
    app.use(express.static(config.distDir, {
      index: false,
      setHeaders(res, file) {
        // hashed bundles never change; html must always be fresh
        if (file.includes(`${path.sep}assets${path.sep}`)) res.set('Cache-Control', 'public, max-age=31536000, immutable');
        else res.set('Cache-Control', 'no-cache');
      },
    }));
    // client-side routes: /admin → admin app, everything else → storefront
    app.use((req, res, next) => {
      if (req.method !== 'GET' || !req.accepts('html')) return next();
      const page = req.path === '/admin' || req.path.startsWith('/admin/') ? 'admin.html' : 'index.html';
      res.set('Cache-Control', 'no-cache').sendFile(path.join(config.distDir, page));
    });
  }

  app.use(errorHandler(log));
  return { app, hub, mailer };
}
