import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/** Thin starlight scroll-progress line along the top edge. */
export const ScrollProgress = () => {
  const ref = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    let raf = 0;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let sv = 0;
    let decay = 0;
    const root = document.documentElement;
    const update = () => {
      raf = 0;
      const max = root.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      if (ref.current) ref.current.style.transform = `scaleX(${p.toFixed(4)})`;
      // scroll velocity → a few degrees of skew for the tickers
      const now = performance.now();
      const v = (window.scrollY - lastY) / Math.max(now - lastT, 1);
      lastY = window.scrollY;
      lastT = now;
      sv += (Math.max(-8, Math.min(8, v * 3)) - sv) * 0.4;
      // set on the tickers only — a custom property on <html> would restyle
      // the entire document every scroll frame
      const setSv = (val) => document.querySelectorAll('.ticker').forEach((el) => el.style.setProperty('--sv', val));
      setSv(sv.toFixed(2));
      clearTimeout(decay);
      decay = setTimeout(() => { sv = 0; setSv('0'); }, 120);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(decay);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [pathname]);

  if (pathname === '/vault') return null;
  return <div ref={ref} className="nv-progress" aria-hidden="true" />;
};

/** Fixed film grain + deep-space vignette on every page. */
export const Atmosphere = () => {
  const { pathname } = useLocation();
  if (pathname === '/vault') return null;
  return (
    <div className="nv-atmos" aria-hidden="true">
      <div className="nv-atmos-edge" />
      <div className="nv-atmos-grain" />
    </div>
  );
};

/**
 * Depth gauge (desktop): the right-edge read-out for the galaxy flight —
 * how far the camera still is from the core, and which arm it's crossing.
 */
const WAYPOINTS = [
  [0, 'Outer rim'],
  [0.36, 'Perseus arm'],
  [0.58, 'Orion spur'],
  [0.8, 'Scutum arm'],
  [1, 'Galactic core'],
];
export const DepthGauge = () => {
  const ref = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const dist = el.querySelector('[data-dist]');
    const zone = el.querySelector('[data-zone]');
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      el.style.setProperty('--p', p.toFixed(4));
      dist.textContent = `${(26 - p * 25.2).toFixed(1)} kly`;
      let name = WAYPOINTS[0][1];
      for (const [at, n] of WAYPOINTS) if (p >= at - 0.04) name = n;
      if (zone.textContent !== name) zone.textContent = name;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [pathname]);
  if (pathname === '/vault') return null;
  return (
    <div ref={ref} className="nv-gauge" aria-hidden="true">
      <span className="nv-gauge-label">To core</span>
      <span className="nv-gauge-dist" data-dist>26.0 kly</span>
      <div className="nv-gauge-track">
        {WAYPOINTS.map(([at, n]) => <i key={n} style={{ top: `${at * 100}%` }} title={n} />)}
        <b className="nv-gauge-marker" />
      </div>
      <span className="nv-gauge-zone" data-zone>Outer rim</span>
    </div>
  );
};
