import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import SporeGPU from './sporeGPU';
import { isLite } from '../lib/quality';

/**
 * BIOME — one fixed GPU spore field behind every page.
 *
 * The whole site floats in it: spores drift on the flow field, part around
 * the pointer anywhere on the page, slide past with scroll parallax, and a
 * click on empty space sends a shockwave through them. Sections tag
 * themselves with data-biome="teal|violet|moss" and the field slowly
 * re-tints toward whichever section owns the middle of the screen.
 */
const PALETTES = {
  teal: [0.72, 0.9],
  violet: [0.3, 0.86],
  moss: [0.38, 0.52],
};

const INTERACTIVE = 'a, button, input, textarea, select, label, [role="button"], [data-tilt]';

const BiomeCanvas = () => {
  const { pathname } = useLocation();
  const ref = useRef(null);
  const enabled = pathname !== '/vault';

  useEffect(() => {
    const canvas = ref.current;
    if (!enabled || !canvas || isLite()) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const small = window.innerWidth < 768;
    const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5);
    const gpu = SporeGPU.create(canvas, { side: small ? 96 : 224, dpr });
    if (!gpu) return undefined;

    const st = {
      t: 0, dt: 1 / 60, mx: -9999, my: -9999, mvx: 0, mvy: 0, lens: 0, R: 220,
      wave: null, attractK: 0, scrollV: 0, w: [...PALETTES.teal], alpha: 0,
    };
    let target = PALETTES.teal;
    let tx = -9999;
    let ty = -9999;
    let active = false;
    let lastY = window.scrollY;
    let prev = performance.now();
    let raf = 0;
    let running = false;

    const resize = () => {
      gpu.resize(window.innerWidth, window.innerHeight);
      st.R = Math.max(160, Math.min(window.innerWidth, window.innerHeight) * 0.26);
    };
    resize();

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      st.t += dt;
      st.dt = dt;
      const k = 1 - Math.exp(-dt * 8);
      const nx = st.mx + (tx - st.mx) * k;
      const ny = st.my + (ty - st.my) * k;
      st.mvx = (nx - st.mx) / Math.max(dt, 1e-3);
      st.mvy = (ny - st.my) / Math.max(dt, 1e-3);
      st.mx = nx;
      st.my = ny;
      st.lens += ((active ? 0.7 : 0) - st.lens) * k;
      const y = window.scrollY;
      st.scrollV = Math.max(-80, Math.min(80, y - lastY));
      lastY = y;
      st.w[0] += (target[0] - st.w[0]) * dt * 1.5;
      st.w[1] += (target[1] - st.w[1]) * dt * 1.5;
      st.alpha += (1 - st.alpha) * dt * 1.2; // fade in on load
      if (st.wave) {
        st.wave.r += dt * 1100;
        st.wave.life -= dt * 1.1;
        if (st.wave.life <= 0) st.wave = null;
      }
      gpu.step(st);
    };
    const start = () => { if (!running) { running = true; prev = performance.now(); raf = requestAnimationFrame(frame); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    const vis = () => (document.hidden ? stop() : start());

    const onMove = (e) => {
      if (!active && st.mx < -9000) { st.mx = e.clientX; st.my = e.clientY; }
      tx = e.clientX;
      ty = e.clientY;
      active = e.pointerType === 'mouse';
    };
    const onLeave = () => { active = false; };
    const onDown = (e) => {
      if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return;
      st.wave = { x: e.clientX, y: e.clientY, r: 0, life: 1 };
    };

    // which biome owns the middle of the screen
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) target = PALETTES[en.target.dataset.biome] || PALETTES.teal;
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    const observeAll = () => document.querySelectorAll('[data-biome]').forEach((el) => io.observe(el));
    observeAll();
    const mo = new MutationObserver(observeAll);
    mo.observe(document.getElementById('main-content') || document.body, { childList: true, subtree: true });

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', vis);
    start();

    return () => {
      stop();
      io.disconnect();
      mo.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', vis);
      gpu.dispose();
    };
  }, [enabled]);

  if (!enabled) return null;
  return <canvas ref={ref} className="nv-biome" aria-hidden="true" />;
};

export default BiomeCanvas;
