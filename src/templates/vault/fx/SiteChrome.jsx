import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/** Thin teal scroll-progress line along the top edge. */
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

/**
 * Route change "scan": a teal scanline sweeps the viewport with a brief grain
 * flash. Pure CSS animation re-triggered by a key, pointer-events none, so it
 * never blocks the click that caused it.
 */
export const RouteWipe = () => {
  const { pathname } = useLocation();
  const [run, setRun] = useState(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (pathname === '/vault') return;
    setRun((n) => n + 1);
  }, [pathname]);

  if (!run) return null;
  return (
    <div key={run} className="nv-wipe" aria-hidden="true">
      <span className="nv-wipe-line" />
    </div>
  );
};

/** Fixed film grain + teal corner glow — the vault's lens, on every page. */
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
 * Growing vine (desktop): a glowing tendril down the right edge that grows
 * with scroll, unfurling a leaf every ~80px and carrying a bright bud at its
 * tip. Pure SVG, path rebuilt only on resize, scroll updates two attributes.
 */
export const VineProgress = () => {
  const { pathname } = useLocation();
  const svgRef = useRef(null);
  const [h, setH] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)');
    const measure = () => setH(mq.matches ? window.innerHeight - 130 : 0);
    measure();
    window.addEventListener('resize', measure);
    mq.addEventListener('change', measure);
    return () => {
      window.removeEventListener('resize', measure);
      mq.removeEventListener('change', measure);
    };
  }, []);

  const W = 34;
  const pts = [];
  for (let y = 0; y <= h; y += 6) pts.push([W / 2 + Math.sin(y * 0.018) * 7 + Math.sin(y * 0.047) * 2.5, y]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1]}`).join(' ');
  const leaves = [];
  for (let y = 60, k = 0; y < h - 10; y += 80, k++) {
    const i = Math.round(y / 6);
    const [x] = pts[Math.min(i, pts.length - 1)] || [W / 2];
    leaves.push({ x, y, side: k % 2 ? 1 : -1, at: y / Math.max(h, 1) });
  }

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !h) return undefined;
    const path = svg.querySelector('.nv-vine-path');
    const tip = svg.querySelector('.nv-vine-tip');
    const leafEls = [...svg.querySelectorAll('.nv-vine-leaf')];
    const len = path.getTotalLength();
    path.style.strokeDasharray = `${len}`;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      path.style.strokeDashoffset = `${len * (1 - p)}`;
      const pt = path.getPointAtLength(len * p);
      tip.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
      leafEls.forEach((el) => el.classList.toggle('is-open', +el.dataset.at <= p + 0.002));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(onScroll);
    ro.observe(document.body);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, [h, pathname]);

  if (!h || pathname === '/vault') return null;
  return (
    <svg ref={svgRef} className="nv-vine" width={W} height={h} viewBox={`0 0 ${W} ${h}`} aria-hidden="true">
      <path d={d} className="nv-vine-ghost" />
      <path d={d} className="nv-vine-path" />
      {leaves.map((l) => (
        <g key={l.y} transform={`translate(${l.x.toFixed(1)} ${l.y}) rotate(${l.side * 55})`}>
          <path className="nv-vine-leaf" data-at={l.at} d="M0 0 C 4 -5, 4 -13, 0 -18 C -4 -13, -4 -5, 0 0 Z" />
        </g>
      ))}
      <g className="nv-vine-tip"><circle r="7" className="nv-vine-halo" /><circle r="2.6" /></g>
    </svg>
  );
};
