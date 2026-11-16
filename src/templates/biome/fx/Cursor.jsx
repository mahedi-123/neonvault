import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const INTERACTIVE = 'a, button, [role="button"], label, select, summary, [data-cursor]';
const TEXTY = 'input, textarea, [contenteditable="true"]';

/**
 * Site-wide pointer layer (fine pointers only):
 *
 *  • a two-part cursor — a dot that sits exactly on the pointer and a lagging
 *    glass ring that swells over anything clickable and can carry a label
 *    (data-cursor="view" on product cards shows VIEW);
 *  • [data-tilt]      — 3D tilt + glare that follows the pointer;
 *  • [data-spotlight] — a radial light that tracks the pointer inside a card;
 *  • [data-magnetic]  — the element leans toward the pointer.
 *
 * Everything is one delegated listener and one rAF loop that only runs
 * while the ring is still catching up, so an idle page costs nothing.
 */
const Cursor = () => {
  const { pathname } = useLocation();
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const labelRef = useRef(null);
  const enabled = pathname !== '/vault';

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!enabled || !fine) return undefined;

    const root = document.documentElement;
    root.classList.add('nv-cursor-on');
    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;

    const pos = { x: -100, y: -100 };
    const ringPos = { x: -100, y: -100 };
    let raf = 0;
    let tiltEl = null;
    let magEl = null;
    let shown = false;

    const animate = () => {
      ringPos.x += (pos.x - ringPos.x) * 0.2;
      ringPos.y += (pos.y - ringPos.y) * 0.2;
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
      if (Math.abs(pos.x - ringPos.x) + Math.abs(pos.y - ringPos.y) > 0.3) raf = requestAnimationFrame(animate);
      else raf = 0;
    };

    const resetTilt = () => {
      if (!tiltEl) return;
      tiltEl.style.setProperty('--rx', '0deg');
      tiltEl.style.setProperty('--ry', '0deg');
      tiltEl.style.setProperty('--glare', '0');
      tiltEl = null;
    };
    const resetMag = () => {
      if (!magEl) return;
      magEl.style.transform = '';
      magEl = null;
    };

    const onMove = (e) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      dot.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      if (!shown) {
        shown = true;
        root.classList.add('nv-cursor-visible');
        ringPos.x = pos.x;
        ringPos.y = pos.y;
      }
      if (!raf) raf = requestAnimationFrame(animate);

      const t = e.target instanceof Element ? e.target : null;
      if (!t) return;

      // hover state of the ring
      const texty = t.closest(TEXTY);
      const hit = texty ? null : t.closest(INTERACTIVE);
      root.classList.toggle('nv-cursor-hover', !!hit);
      root.classList.toggle('nv-cursor-text', !!texty);
      const lbl = hit?.closest('[data-cursor]')?.getAttribute('data-cursor') || '';
      if (label.textContent !== lbl) label.textContent = lbl;
      root.classList.toggle('nv-cursor-label', !!lbl);

      // spotlight
      const spot = t.closest('[data-spotlight], [data-tilt]');
      if (spot) {
        const r = spot.getBoundingClientRect();
        spot.style.setProperty('--mx', `${e.clientX - r.left}px`);
        spot.style.setProperty('--my', `${e.clientY - r.top}px`);
      }

      if (reduced) return;
      // tilt
      const tilt = t.closest('[data-tilt]');
      if (tilt !== tiltEl) resetTilt();
      if (tilt) {
        tiltEl = tilt;
        const r = tilt.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        const max = parseFloat(tilt.dataset.tilt) || 8;
        tilt.style.setProperty('--rx', `${(-ny * max).toFixed(2)}deg`);
        tilt.style.setProperty('--ry', `${(nx * max).toFixed(2)}deg`);
        tilt.style.setProperty('--glare', '1');
      }
      // magnetic
      const mag = t.closest('[data-magnetic]');
      if (mag !== magEl) resetMag();
      if (mag) {
        magEl = mag;
        const r = mag.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const k = parseFloat(mag.dataset.magnetic) || 0.25;
        mag.style.transform = `translate3d(${(dx * k).toFixed(1)}px, ${(dy * k).toFixed(1)}px, 0)`;
      }
    };

    const onDown = () => root.classList.add('nv-cursor-down');
    const onUp = () => root.classList.remove('nv-cursor-down');
    const onLeave = () => {
      shown = false;
      root.classList.remove('nv-cursor-visible');
      resetTilt();
      resetMag();
    };

    // scrolling moves content under a still pointer: re-hit-test so the
    // ring's label/hover state never goes stale
    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf || !shown) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        const el = document.elementFromPoint(pos.x, pos.y);
        if (el) onMove({ clientX: pos.x, clientY: pos.y, target: el });
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.documentElement.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      resetTilt();
      resetMag();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(scrollRaf);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerleave', onLeave);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      root.classList.remove('nv-cursor-on', 'nv-cursor-visible', 'nv-cursor-hover', 'nv-cursor-text', 'nv-cursor-label', 'nv-cursor-down');
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div className="nv-cursor" aria-hidden="true">
      <div ref={ringRef} className="nv-cursor-ring"><span ref={labelRef} className="nv-cursor-text-label" /></div>
      <div ref={dotRef} className="nv-cursor-dot" />
    </div>
  );
};

export default Cursor;
