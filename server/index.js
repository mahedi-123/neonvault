import fs from 'node:fs';
import path from 'node:path';
import { config, ROOT } from './config.js';
import { openDb, seed } from './db.js';
import { createApp } from './app.js';
import { log } from './lib/log.js';

const serveStatic = config.isProd || process.argv.includes('--static');
const db = openDb(config.dbFile);
const { adminPassword } = await seed(db, { adminEmail: config.adminEmail, adminPassword: config.adminPassword, log });

const credFile = path.join(ROOT, 'server', 'data', 'admin-login.txt');
if (adminPassword) {
  fs.writeFileSync(credFile, `NEONVAULT admin login\nEmail:    ${config.adminEmail}\nPassword: ${adminPassword}\n\nChange it after signing in (Admin → Settings).\n`);
}

const { app, hub } = createApp({ db, config, log, serveStatic });
const server = app.listen(config.port, config.host, () => {
  log.info(`NEONVAULT API  → http://${config.host === '0.0.0.0' ? 'localhost' : config.host}:${config.port}/api/health`);
  if (serveStatic) log.info(`Storefront     → http://localhost:${config.port}/   Admin → http://localhost:${config.port}/admin`);
  if (config.adminPassword) log.info(`Admin login    → ${config.adminEmail} / ${config.adminPassword}`);
  else if (adminPassword) log.info(`Admin login    → ${config.adminEmail} / ${adminPassword}  (also saved in server/data/admin-login.txt)`);
  else if (fs.existsSync(credFile)) log.info('Admin login    → see server/data/admin-login.txt');
});

// expire old sessions once an hour
setInterval(() => db.run("DELETE FROM sessions WHERE expires_at < strftime('%Y-%m-%dT%H:%M:%fZ','now')"), 36e5).unref();

const shutdown = () => {
  log.info('Shutting down…');
  hub.close();
  server.close(() => { db.close(); process.exit(0); });
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
