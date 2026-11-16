/**
 * MYCELIUM BLOOM — the hero's pointer-reactive field.
 *
 * Thousands of glowing spores drift on a slowly turning flow field. The
 * pointer is a living lens:
 *   • spores within reach are pulled into an orbiting halo around it;
 *   • nearby spores sprout mycelium threads to one another, and a few
 *     tendrils reach from the lens out to them, so a glowing network grows
 *     wherever the pointer rests and withers where it leaves;
 *   • moving fast drags a wake of spores behind it;
 *   • clicking fires a shockwave that blasts the halo outward and seeds a
 *     burst of new spores.
 * With no pointer (touch, or idle) a ghost lens wanders on a Lissajous path
 * so the hero is never dead.
 *
 * Plain Canvas2D — no WebGL, no dependency — with typed arrays, pre-rendered
 * glow sprites and a spatially bounded thread search, so it holds 60fps on a
 * laptop iGPU. It stops entirely when off-screen or the tab is hidden.
 */

import SporeGPU from './sporeGPU';

const PALETTE = [
  [94, 234, 212], // teal
  [167, 139, 250], // violet
  [196, 217, 74], // moss
  [232, 246, 243], // pale
];
const WEIGHTS = [0.62, 0.2, 0.12, 0.06];

function makeSprite(rgb, size = 64) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, `rgba(255,255,255,1)`);
  grd.addColorStop(0.12, `rgba(${rgb},1)`);
  grd.addColorStop(0.4, `rgba(${rgb},0.28)`);
  grd.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return c;
}

export default class MyceliumField {
  constructor(canvas, { lite = false, reduced = false, gpuCanvas = null } = {}) {
    this.canvas = canvas;
    this.lite = lite;
    this.reduced = reduced;
    this.dpr = Math.min(window.devicePixelRatio || 1, lite ? 1 : window.innerWidth < 768 ? 1.25 : 1.5);
    // tens of thousands of GPU spores behind the mycelium layer, when possible
    this.gpu = gpuCanvas && !lite && !reduced
      ? SporeGPU.create(gpuCanvas, { side: window.innerWidth < 768 ? 128 : 256, dpr: this.dpr })
      : null;
    // with the GPU layer underneath, this canvas must be see-through
    this.ctx = canvas.getContext('2d', { alpha: !!this.gpu });
    this.sprites = PALETTE.map((c) => makeSprite(c.join(',')));
    this.pointer = { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0, active: false, last: -1e9 };
    this.waves = [];
    this.running = false;
    this.t = 0;
    this.resize();
    this.seed();
    this.loop = this.loop.bind(this);
  }

  get count() {
    const area = this.w * this.h;
    const base = this.lite ? 380 : this.gpu ? 760 : 1150;
    return Math.round(Math.min(base, Math.max(260, (area / (1440 * 900)) * base)));
  }

  resize() {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.R = Math.max(130, Math.min(w, h) * 0.24); // lens reach
    if (this.gpu) {
      this.gpu.resize(w, h);
      this.ctx.clearRect(0, 0, w, h);
    } else {
      this.ctx.fillStyle = '#05080b';
      this.ctx.fillRect(0, 0, w, h);
    }
    if (this.px && this.px.length !== this.count) this.seed();
  }

  seed() {
    const n = this.count;
    this.n = n;
    this.px = new Float32Array(n);
    this.py = new Float32Array(n);
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
    this.life = new Float32Array(n);
    this.size = new Float32Array(n);
    this.kind = new Uint8Array(n);
    this.glow = new Float32Array(n);
    for (let i = 0; i < n; i++) this.spawn(i, true);
  }

  spawn(i, anywhere, x, y) {
    this.px[i] = x ?? Math.random() * this.w;
    this.py[i] = y ?? Math.random() * this.h;
    this.vx[i] = 0;
    this.vy[i] = 0;
    this.life[i] = anywhere ? Math.random() : 1;
    this.size[i] = 0.6 + Math.pow(Math.random(), 3) * 2.4;
    let r = Math.random();
    let k = 0;
    while (k < WEIGHTS.length - 1 && r > WEIGHTS[k]) { r -= WEIGHTS[k]; k++; }
    this.kind[i] = k;
    this.glow[i] = 0;
  }

  setPointer(x, y) {
    const p = this.pointer;
    if (!p.active) { p.x = x; p.y = y; }
    p.tx = x;
    p.ty = y;
    p.active = true;
    p.last = this.t;
  }

  leave() { this.pointer.active = false; }

  /** Pull every spore into (x, y) — the vault door swallowing the field. */
  implode(x, y) {
    this.attractor = { x, y, t0: this.t };
    this.setPointer(x, y);
    this.gpu?.implode(x, y);
  }

  burst(x, y) {
    this.waves.push({ x, y, r: 0, life: 1 });
    // seed a ring of fresh spores at the click
    for (let k = 0; k < 40; k++) {
      const i = (Math.random() * this.n) | 0;
      const a = Math.random() * Math.PI * 2;
      this.spawn(i, false, x + Math.cos(a) * 6, y + Math.sin(a) * 6);
      const s = 4 + Math.random() * 7;
      this.vx[i] = Math.cos(a) * s;
      this.vy[i] = Math.sin(a) * s;
      this.glow[i] = 1;
    }
  }

  start() {
    if (this.running || this.reduced) { if (this.reduced) this.drawStatic(); return; }
    this.running = true;
    this.prev = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  drawStatic() {
    this.t = 4;
    for (let k = 0; k < 90; k++) this.step(1 / 60);
  }

  loop(now) {
    if (!this.running) return;
    const dt = Math.min((now - this.prev) / 1000, 0.05);
    this.prev = now;
    this.step(dt);
    this.raf = requestAnimationFrame(this.loop);
  }

  step(dt) {
    const { ctx, w, h, R } = this;
    this.t += dt;
    const t = this.t;
    const p = this.pointer;
    const f60 = dt * 60;

    // --- lens: real pointer, or a wandering ghost when idle
    const idle = !p.active;
    const gx = w * (0.66 + 0.2 * Math.sin(t * 0.31));
    const gy = h * (0.52 + 0.26 * Math.sin(t * 0.47 + 1.2));
    const tx = idle ? gx : p.tx;
    const ty = idle ? gy : p.ty;
    const ease = 1 - Math.exp(-dt * (idle ? 2 : 9));
    const nx = p.x + (tx - p.x) * ease;
    const ny = p.y + (ty - p.y) * ease;
    p.vx = (nx - p.x) / Math.max(dt, 1e-3);
    p.vy = (ny - p.y) / Math.max(dt, 1e-3);
    p.x = nx;
    p.y = ny;
    const lensPower = idle ? 0.55 : 1;
    const speed = Math.min(Math.hypot(p.vx, p.vy), 2400);

    // --- trails: fade the previous frame instead of clearing it
    if (this.gpu) {
      // transparent canvas: erase 20% of the last frame instead of painting over it
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(5,8,11,0.2)';
      ctx.fillRect(0, 0, w, h);
    }
    if (this.gpu) {
      const wv = this.waves[this.waves.length - 1];
      this.gpu.step({
        t, dt, mx: p.x, my: p.y, mvx: p.vx, mvy: p.vy, lens: lensPower, R: R * 1.25,
        wave: wv || null,
        attractK: this.attractor ? Math.min((t - this.attractor.t0) / 0.6, 1) : 0,
      });
    }

    // lens glow
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R * 1.15);
    lg.addColorStop(0, `rgba(94,234,212,${0.07 * lensPower})`);
    lg.addColorStop(0.5, `rgba(167,139,250,${0.03 * lensPower})`);
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(p.x - R * 1.2, p.y - R * 1.2, R * 2.4, R * 2.4);

    // --- waves
    for (let k = this.waves.length - 1; k >= 0; k--) {
      const wv = this.waves[k];
      wv.r += dt * 900;
      wv.life -= dt * 1.1;
      if (wv.life <= 0) { this.waves.splice(k, 1); continue; }
      ctx.strokeStyle = `rgba(201,255,244,${0.5 * wv.life})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(wv.x, wv.y, wv.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(167,139,250,${0.35 * wv.life})`;
      ctx.beginPath();
      ctx.arc(wv.x, wv.y, wv.r * 0.82, 0, Math.PI * 2);
      ctx.stroke();
    }

    // --- spores
    const near = this.near || (this.near = new Int32Array(160));
    let nearN = 0;
    const ring = R * 0.42;
    const R2 = R * R;
    const flowK = 0.0019;
    for (let i = 0; i < this.n; i++) {
      let x = this.px[i];
      let y = this.py[i];
      // flow field
      const a = (Math.sin(x * flowK + t * 0.13) + Math.sin(y * flowK * 1.3 - t * 0.11) + Math.sin((x + y) * flowK * 0.6 + t * 0.07)) * 1.7;
      let vx = this.vx[i] + (Math.cos(a) * 0.55 - this.vx[i]) * 0.04 * f60;
      let vy = this.vy[i] + (Math.sin(a) * 0.55 - 0.08 - this.vy[i]) * 0.04 * f60;

      // lens
      const dx = x - p.x;
      const dy = y - p.y;
      const d2 = dx * dx + dy * dy;
      let prox = 0;
      if (d2 < R2) {
        const d = Math.sqrt(d2) + 0.001;
        prox = 1 - d / R;
        const fk = prox * lensPower * f60;
        // swirl
        vx += (-dy / d) * 0.32 * fk;
        vy += (dx / d) * 0.32 * fk;
        // settle onto the halo
        vx += (dx / d) * (ring - d) * 0.006 * fk;
        vy += (dy / d) * (ring - d) * 0.006 * fk;
        // wake
        vx += p.vx * 0.0009 * fk;
        vy += p.vy * 0.0009 * fk;
        if (nearN < near.length && prox > 0.08) near[nearN++] = i;
      }
      // shockwaves push spores outward as the ring passes
      for (let k = 0; k < this.waves.length; k++) {
        const wv = this.waves[k];
        const ex = x - wv.x;
        const ey = y - wv.y;
        const ed = Math.sqrt(ex * ex + ey * ey) + 0.001;
        const band = Math.abs(ed - wv.r);
        if (band < 26) {
          const push = (1 - band / 26) * 3.2 * wv.life * f60;
          vx += (ex / ed) * push;
          vy += (ey / ed) * push;
          this.glow[i] = 1;
        }
      }

      if (this.attractor) {
        const k = Math.min((t - this.attractor.t0) / 0.6, 1) * f60;
        vx += (this.attractor.x - x) * 0.018 * k;
        vy += (this.attractor.y - y) * 0.018 * k;
        this.glow[i] = 1;
      }

      vx *= 0.965;
      vy *= 0.965;
      x += vx * f60;
      y += vy * f60;
      if (x < -20) x += w + 40; else if (x > w + 20) x -= w + 40;
      if (y < -20) y += h + 40; else if (y > h + 20) y -= h + 40;
      this.px[i] = x;
      this.py[i] = y;
      this.vx[i] = vx;
      this.vy[i] = vy;
      this.life[i] -= dt * 0.03;
      if (this.life[i] <= 0) this.spawn(i, false);
      this.glow[i] = Math.max(this.glow[i] - dt * 1.4, prox * lensPower);

      const g = this.glow[i];
      const life = this.life[i];
      const fade = Math.min(1, life * 6) * Math.min(1, (1 - life) * 8 + 0.25);
      const s = this.size[i] * (2.2 + g * 3.2);
      ctx.globalAlpha = Math.min(1, (0.35 + g * 0.65) * fade);
      ctx.drawImage(this.sprites[this.kind[i]], x - s, y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1;

    // --- mycelium threads between spores inside the lens
    const linkD = Math.max(54, R * 0.38);
    const linkD2 = linkD * linkD;
    const buckets = [[], [], []];
    for (let a = 0; a < nearN; a++) {
      const i = near[a];
      const xi = this.px[i];
      const yi = this.py[i];
      let links = 0;
      for (let b = a + 1; b < nearN && links < 3; b++) {
        const j = near[b];
        const ex = this.px[j] - xi;
        const ey = this.py[j] - yi;
        const dd = ex * ex + ey * ey;
        if (dd < linkD2) {
          const strength = (1 - dd / linkD2) * Math.min(this.glow[i], this.glow[j]);
          buckets[strength > 0.45 ? 2 : strength > 0.2 ? 1 : 0].push(xi, yi, this.px[j], this.py[j]);
          links++;
        }
      }
    }
    ctx.lineWidth = 0.8;
    const alphas = [0.12, 0.26, 0.5];
    for (let k = 0; k < 3; k++) {
      const arr = buckets[k];
      if (!arr.length) continue;
      ctx.strokeStyle = `rgba(127,224,210,${alphas[k] * lensPower})`;
      ctx.beginPath();
      for (let q = 0; q < arr.length; q += 4) {
        ctx.moveTo(arr[q], arr[q + 1]);
        ctx.lineTo(arr[q + 2], arr[q + 3]);
      }
      ctx.stroke();
    }

    // --- tendrils from the lens out to the brightest few
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(196,181,253,${0.35 * lensPower})`;
    ctx.beginPath();
    const step = Math.max(1, Math.floor(nearN / 7));
    for (let a = 0; a < nearN; a += step) {
      const i = near[a];
      const x = this.px[i];
      const y = this.py[i];
      const mx = (p.x + x) / 2;
      const my = (p.y + y) / 2;
      const bend = Math.sin(t * 2 + i) * 18;
      const dx = y - p.y;
      const dy = p.x - x;
      const dl = Math.hypot(dx, dy) || 1;
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(mx + (dx / dl) * bend, my + (dy / dl) * bend, x, y);
    }
    ctx.stroke();

    // --- HUD ring around the lens
    ctx.globalCompositeOperation = 'source-over';
    const hudA = (idle ? 0.25 : 0.6) + Math.min(speed / 3000, 0.3);
    ctx.strokeStyle = `rgba(201,255,244,${hudA})`;
    ctx.lineWidth = 1;
    const rot = t * 0.6;
    for (let k = 0; k < 4; k++) {
      const s0 = rot + (k * Math.PI) / 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, ring * 0.55, s0, s0 + 0.9);
      ctx.stroke();
    }
    ctx.strokeStyle = `rgba(94,234,212,${hudA * 0.45})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, ring * 0.55 + 7, -rot * 1.4, -rot * 1.4 + Math.PI * 1.2);
    ctx.stroke();
    if (!idle) {
      ctx.fillStyle = `rgba(201,255,244,${hudA * 0.8})`;
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`X ${String(Math.round(p.x)).padStart(4, '0')}  Y ${String(Math.round(p.y)).padStart(4, '0')}`, p.x + ring * 0.55 + 14, p.y - 6);
      ctx.fillText(`SPORES ${String(nearN).padStart(3, '0')}`, p.x + ring * 0.55 + 14, p.y + 8);
    }
  }

  dispose() {
    this.stop();
    this.gpu?.dispose();
  }
}
