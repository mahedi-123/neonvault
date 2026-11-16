import { useEffect, useState } from 'react';

/**
 * First-visit intro (once per browser session): a spore counter blooms from
 * 000 to 100 around the vault mark, then the screen splits open onto the
 * page. Never longer than ~1.4s, skipped under reduced motion and on direct
 * visits to the vault (it has its own loader).
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
  const [count, setCount] = useState(0);
  const [out, setOut] = useState(false);
  const [gone, setGone] = useState(!show);

  useEffect(() => {
    if (!show) return undefined;
    try { sessionStorage.setItem(KEY, '1'); } catch { /* private mode */ }
    const root = document.documentElement;
    root.classList.add('nv-intro-on');
    const t0 = performance.now();
    let raf = 0;
    const tick = (now) => {
      const p = Math.min((now - t0) / 1150, 1);
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const a = setTimeout(() => { setOut(true); root.classList.remove('nv-intro-on'); }, 1300);
    const b = setTimeout(() => setGone(true), 2200);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(a);
      clearTimeout(b);
      root.classList.remove('nv-intro-on');
    };
  }, [show]);

  if (gone) return null;
  return (
    <div className={`nv-intro ${out ? 'is-out' : ''}`} aria-hidden="true">
      <div className="nv-intro-half nv-intro-top" />
      <div className="nv-intro-half nv-intro-bottom" />
      <div className="nv-intro-core">
        <svg viewBox="0 0 120 120" className="nv-intro-ring">
          <circle cx="60" cy="60" r="54" className="track" />
          <circle cx="60" cy="60" r="54" className="bar" pathLength="100" style={{ strokeDashoffset: 100 - count }} />
        </svg>
        <span className="nv-intro-count">{String(count).padStart(3, '0')}</span>
        <span className="nv-intro-brand">NEON<b>VAULT</b></span>
        <span className="nv-intro-tag">GROWING THE ARCHIVE</span>
      </div>
    </div>
  );
};

export default Intro;
