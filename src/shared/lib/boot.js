import { api, backend, detectBackend } from './api.js';
import { hydrateCatalog } from '../data/products.js';
import { startLive } from './live.js';

/** What the app knows before React mounts (filled by bootstrap()). */
export const boot = { user: null, online: false };

/**
 * Runs before the chosen design mounts: finds the backend, swaps in the live
 * catalog and restores the signed-in user. Capped so a slow or missing API
 * never holds the page back — the bundled catalog is used instead.
 */
export async function bootstrap() {
  const online = await detectBackend();
  boot.online = online;
  if (!online) return boot;
  const [catalog, me] = await Promise.allSettled([api.get('/products'), api.get('/auth/me')]);
  if (catalog.status === 'fulfilled') hydrateCatalog(catalog.value.products);
  if (me.status === 'fulfilled') boot.user = me.value.user;
  startLive();
  return boot;
}

export { backend };
