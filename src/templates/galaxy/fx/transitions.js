/**
 * Imperative, route-surviving transitions. These live outside React on
 * purpose: each one has to keep animating while React swaps the page out
 * from under it.
 *
 *  • morph      — a product card's image flies into the product page's hero
 *                 image (FLIP onto a target that is measured live every frame,
 *                 so page-transition offsets and scroll resets never miss).
 *  • flyToCart  — the product image arcs into the navbar cart, bursts into
 *                 spores, and the cart icon jolts.
 *  • vaultPortal — a light-burst that opens from the "Enter the Vault" button
 *                 and covers the cut into the vault.
 */

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

function cloneImage(img, rect, radius) {
  const el = document.createElement('div');
  el.className = 'nv-fly';
  Object.assign(el.style, {
    left: '0px', top: '0px', width: `${rect.width}px`, height: `${rect.height}px`,
    transform: `translate3d(${rect.left}px, ${rect.top}px, 0)`, borderRadius: `${radius}px`,
  });
  const im = document.createElement('img');
  im.src = img.currentSrc || img.src;
  im.alt = '';
  el.appendChild(im);
  document.body.appendChild(el);
  return el;
}

const place = (el, r, radius) => {
  el.style.width = `${r.width}px`;
  el.style.height = `${r.height}px`;
  el.style.transform = `translate3d(${r.left}px, ${r.top}px, 0)`;
  if (radius != null) el.style.borderRadius = `${radius}px`;
};

/* ------------------------------------------------------------------ morph */

let pending = null;

export const hasPendingMorph = () => !!pending && performance.now() - pending.t0 < 1500;

export function startMorph(img) {
  if (!img || reduced() || !img.complete || !img.naturalWidth) return;
  pending?.el.remove();
  const rect = img.getBoundingClientRect();
  if (rect.width < 10) return;
  const el = cloneImage(img, rect, 16);
  pending = { el, rect, t0: performance.now() };
  // safety: if no page claims it, dissolve it
  const mine = pending;
  setTimeout(() => {
    if (pending !== mine) return;
    el.style.transition = 'opacity 0.3s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 320);
    pending = null;
  }, 1600);
}

/** Called by the product page with its hero image container. */
export function finishMorph(target) {
  if (!pending || !target) return;
  const { el, rect: from } = pending;
  pending = null;
  target.style.visibility = 'hidden';
  const dur = 720;
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min((now - t0) / dur, 1);
    const k = easeInOut(p);
    const to = target.getBoundingClientRect();
    place(el, {
      left: lerp(from.left, to.left, k),
      top: lerp(from.top, to.top, k),
      width: lerp(from.width, to.width, k),
      height: lerp(from.height, to.height, k),
    }, lerp(16, 16, k));
    if (p < 1) requestAnimationFrame(step);
    else {
      target.style.visibility = '';
      el.style.transition = 'opacity 0.25s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 260);
    }
  };
  requestAnimationFrame(step);
}

/* -------------------------------------------------------------- flyToCart */

function burst(x, y) {
  const host = document.createElement('div');
  host.className = 'nv-burst';
  host.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('i');
    const a = (i / 14) * Math.PI * 2;
    const d = 22 + Math.random() * 26;
    s.style.setProperty('--x', `${Math.cos(a) * d}px`);
    s.style.setProperty('--y', `${Math.sin(a) * d}px`);
    s.style.background = s.style.color = ['#8ab4ff', '#f0abfc', '#ffd27a', '#e3ebff'][i % 4];
    host.appendChild(s);
  }
  document.body.appendChild(host);
  setTimeout(() => host.remove(), 800);
}

/** Resolves when the image has landed in the cart (immediately if reduced). */
export function flyToCart(img) {
  return new Promise((resolve) => {
    if (!img || reduced() || !img.naturalWidth) { resolve(); return; }
    window.dispatchEvent(new Event('nv:show-nav'));
    const from = img.getBoundingClientRect();
    const start = { left: from.left, top: from.top, width: from.width, height: from.height };
    const el = cloneImage(img, start, 16);
    el.classList.add('nv-fly-cart');
    const dur = 760;
    const t0 = performance.now();
    const cartBtn = () => document.querySelector('header button[aria-label^="Cart"]');
    const step = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      const k = easeInOut(p);
      const btn = cartBtn();
      const to = btn ? btn.getBoundingClientRect() : { left: window.innerWidth - 60, top: 20, width: 40, height: 40 };
      const size = lerp(Math.min(start.width, 180), 18, k);
      const sx = start.left + start.width / 2;
      const sy = start.top + start.height / 2;
      const tx = to.left + to.width / 2;
      const ty = to.top + to.height / 2;
      // arc: rise, then dive into the cart
      const x = lerp(sx, tx, k);
      const y = lerp(sy, ty, k) - Math.sin(Math.PI * k) * 140;
      place(el, { left: x - size / 2, top: y - size / 2, width: size, height: size }, size / 2);
      el.style.opacity = String(1 - Math.max(0, k - 0.85) * 4);
      if (p < 1) requestAnimationFrame(step);
      else {
        el.remove();
        burst(tx, ty);
        const b = cartBtn();
        if (b) {
          b.classList.remove('nv-jolt');
          void b.offsetWidth;
          b.classList.add('nv-jolt');
        }
        resolve();
      }
    };
    requestAnimationFrame(step);
  });
}

/* ------------------------------------------------------------ vault portal */

/** Opens a light-burst from `originEl`, then calls `go` under full cover. */
export function vaultPortal(originEl, go) {
  if (reduced() || !originEl) { go(); return; }
  const r = originEl.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'nv-portal';
  el.style.setProperty('--px', `${r.left + r.width / 2}px`);
  el.style.setProperty('--py', `${r.top + r.height / 2}px`);
  el.innerHTML = '<span class="nv-portal-ring"></span><span class="nv-portal-ring nv-portal-ring-2"></span><span class="nv-portal-fill"></span>';
  document.body.appendChild(el);
  setTimeout(go, 820);
  // the vault's loader is underneath by now — dissolve into it
  setTimeout(() => el.classList.add('is-out'), 1250);
  setTimeout(() => el.remove(), 2300);
}
