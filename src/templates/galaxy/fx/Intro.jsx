import { useEffect, useState } from 'react';
import { warp } from './GalaxyCanvas';

/**
 * First-visit intro (once per browser session): the page arrives out of
 * hyperspace. Star streaks race past while a light-year counter falls to
 * zero, then the galaxy settles in behind the hero. ~1.6s, skipped under
 * reduced motion and on direct visits to the vault.
 */
const KEY = 'nv-intro-seen';

const shouldShow = () => {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    if (/\/vault/.test(window.location.pathname + window.location.hash)) return false;
    return !sessionStorage.getItem(KEY);
  } catch {
    return false;
  }
};

const Intro = () => {
  const [show] = useState(shouldShow);
  const [ly, setLy] = useState(2.54);
  const [out, setOut] = useState(false);
  const [gone, setGone] = useState(!show);

  useEffect(() => {
    if (!show) return undefined;
    try { sessionStorage.setItem(KEY, '1'); } catch { /* private mode */ }
    const root = document.documentElement;
    root.classList.add('nv-intro-on');
    // give the engine a frame to exist, then jump
    const w = setTimeout(() => warp({ duration: 1.9, travel: false }), 60);
    const t0 = performance.now();
    let raf = 0;
    const tick = (now) => {
      const p = Math.min((now - t0) / 1300, 1);
      setLy(2.54 * Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const a = setTimeout(() => { setOut(true); root.classList.remove('nv-intro-on'); }, 1450);
    const b = setTimeout(() => setGone(true), 2300);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(w);
      clearTimeout(a);
      clearTimeout(b);
      root.classList.remove('nv-intro-on');
    };
  }, [show]);

  if (gone) return null;
  return (
    <div className={`nv-intro nv-intro-warp ${out ? 'is-out' : ''}`} aria-hidden="true">
      <div className="nv-intro-core">
        <span className="nv-intro-tag">Engaging hyperdrive</span>
        <span className="nv-intro-brand">NEON<b>VAULT</b></span>
        <span className="nv-intro-count">{ly.toFixed(2)}<small> Mly to Milky Way</small></span>
      </div>
    </div>
  );
};

export default Intro;
