// The designs that ship in this project. Add a folder under src/templates/
// with an entry.jsx and list it here to make it switchable.
export const TEMPLATES = [
  { id: 'original', name: 'Original', note: 'The first NEONVAULT storefront', load: () => import('../templates/original/entry.jsx') },
  { id: 'vault', name: 'Vault Tree', note: 'Vault theme, living tree, mycelium hero', load: () => import('../templates/vault/entry.jsx') },
  { id: 'biome', name: 'Biome', note: 'Futuristic: GPU biome, orbit hero, command dock', load: () => import('../templates/biome/entry.jsx') },
  { id: 'galaxy', name: 'Galaxy', note: '3D Milky Way: fly through a spiral galaxy as you scroll', load: () => import('../templates/galaxy/entry.jsx') },
];

export const DEFAULT_TEMPLATE = 'biome';
const KEY = 'nv-template';

const valid = (id) => TEMPLATES.some((t) => t.id === id);

/** ?template=id (local dev links) > saved choice > default. */
export function readTemplate() {
  try {
    const q = new URLSearchParams(location.search).get('template');
    if (valid(q)) return q;
  } catch { /* no query access */ }
  try {
    const s = localStorage.getItem(KEY);
    if (valid(s)) return s;
  } catch { /* storage blocked */ }
  // window.name survives a reload in the same tab even when storage is blocked
  const m = /(?:^|;)nv-template=([a-z]+)/.exec(window.name || '');
  if (m && valid(m[1])) return m[1];
  return DEFAULT_TEMPLATE;
}

/**
 * Switching reloads the page so only one design's stylesheet and global
 * effects are ever live — the three designs define the same tokens and
 * class names differently and must never share a document.
 */
export function switchTemplate(id) {
  if (!valid(id)) return;
  try { localStorage.setItem(KEY, id); } catch { /* storage blocked */ }
  window.name = `${(window.name || '').replace(/(?:^|;)nv-template=[a-z]+/g, '')};nv-template=${id}`;
  try {
    const url = new URL(location.href);
    if (url.searchParams.has('template')) {
      url.searchParams.set('template', id);
      location.replace(url.toString());
      return;
    }
  } catch { /* fall through */ }
  location.reload();
}
