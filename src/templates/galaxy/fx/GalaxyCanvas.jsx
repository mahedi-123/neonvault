import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import GalaxyEngine from './galaxy/GalaxyEngine';
import { isLite } from '../lib/quality';

const INTERACTIVE = 'a, button, input, textarea, select, label, [role="button"], [data-tilt]';

/** Ask the galaxy for a hyperspace jump from anywhere: warp({ duration }). */
export const warp = (detail = {}) => window.dispatchEvent(new CustomEvent('nv:warp', { detail }));

/**
 * The fixed 3D Milky Way behind every page (except the vault, which brings
 * its own world). Scroll flies the camera, the pointer lenses the stars,
 * clicks on empty space send a shockwave, and every route change is a jump
 * through hyperspace.
 */
const GalaxyCanvas = () => {
  const { pathname } = useLocation();
  const ref = useRef(null);
  const engineRef = useRef(null);
  const lastPath = useRef(pathname);
  const enabled = pathname !== '/vault';

  useEffect(() => {
    const canvas = ref.current;
    if (!enabled || !canvas) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const small = window.innerWidth < 768;
    const engine = GalaxyEngine.create(canvas, { lite: isLite(), small, reduced });
    if (!engine) { canvas.classList.add('is-fallback'); return undefined; }
    engineRef.current = engine;
    // if the GPU drops the context, show the painted galaxy instead of a black screen
    const onLost = (e) => { e.preventDefault(); canvas.classList.add('is-fallback'); };
    const onRestored = () => canvas.classList.remove('is-fallback');
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    let raf = 0;
    let running = false;
    let prev = performance.now();
    const progress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? window.scrollY / max : 0;
    };
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      engine.setScroll(progress());
      engine.step(dt);
      canvas.classList.add('is-ready');
    };
    const start = () => {
      if (running) return;
      running = true;
      prev = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    // reduced motion: a still image that only re-renders on scroll/resize
    const still = () => { engine.setScroll(progress()); engine.scroll = engine.scrollTarget; engine.step(0); canvas.classList.add('is-ready'); };

    const onVis = () => {
      if (reduced) return;
      if (document.hidden) stop(); else start();
    };
    const onResize = () => { engine.resize(window.innerWidth, window.innerHeight); if (reduced) still(); };
    const onMove = (e) => engine.setPointer(e.clientX, e.clientY, e.pointerType === 'mouse');
    const onLeave = () => engine.leave();
    const onDown = (e) => {
      if (e.target instanceof Element && e.target.closest(INTERACTIVE)) return;
      engine.pulse(e.clientX, e.clientY);
    };
    const onWarp = (e) => engine.warp(e.detail?.duration ?? 1.1, e.detail?.travel ?? true);
    const onScroll = () => { if (reduced) still(); };

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('nv:warp', onWarp);
    if (!reduced) {
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerdown', onDown, { passive: true });
      document.documentElement.addEventListener('mouseleave', onLeave);
      start();
    } else {
      window.addEventListener('scroll', onScroll, { passive: true });
      still();
    }

    return () => {
      stop();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('nv:warp', onWarp);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', onScroll);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      engine.dispose();
      engineRef.current = null;
    };
  }, [enabled]);

  // every navigation is a hyperspace jump (not the first paint)
  useEffect(() => {
    if (lastPath.current === pathname) return; // first paint (and StrictMode re-runs)
    lastPath.current = pathname;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    engineRef.current?.warp(0.95, true);
  }, [pathname]);

  if (!enabled) return null;
  return <canvas ref={ref} className="nv-galaxy" aria-hidden="true" />;
};

export default GalaxyCanvas;
