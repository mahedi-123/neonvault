import { useEffect, useRef, useState } from 'react';
import { formatPrice } from '../utils/helpers';

/**
 * Hero product orbit — featured products ride a 3D ring (pure CSS 3D, one
 * rAF loop). It drifts on its own, can be dragged or flicked with inertia,
 * and the card that comes round to the front lights up. Clicking the front
 * card opens it; clicking any other card spins it to the front.
 */
const OrbitCarousel = ({ products, onOpen }) => {
  const ringRef = useRef(null);
  const cardsRef = useRef([]);
  const state = useRef({ angle: 0, vel: 0, target: null, drag: null, hover: false });
  const [front, setFront] = useState(0);
  const n = products.length;
  const step = 360 / n;

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let prev = performance.now();
    let lastFront = -1;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      const s = state.current;
      if (s.target !== null) {
        const d = s.target - s.angle;
        s.angle += d * (1 - Math.exp(-dt * 7));
        if (Math.abs(d) < 0.05) { s.angle = s.target; s.target = null; }
      } else if (!s.drag) {
        s.angle += s.vel * dt;
        s.vel *= Math.exp(-dt * 2.2);
        if (!reduced && !s.hover && Math.abs(s.vel) < 8) s.angle -= 7 * dt; // ambient drift
      }
      const ring = ringRef.current;
      if (!ring) return;
      ring.style.transform = `translateZ(calc(var(--r) * -1)) rotateY(${s.angle.toFixed(2)}deg)`;
      let best = 0;
      let bestCos = -2;
      cardsRef.current.forEach((el, i) => {
        if (!el) return;
        const rel = ((i * step + s.angle) % 360 + 360) % 360;
        const c = Math.cos((rel * Math.PI) / 180);
        if (c > bestCos) { bestCos = c; best = i; }
        const lit = Math.max(0, c);
        el.style.opacity = (0.25 + 0.75 * (c * 0.5 + 0.5)).toFixed(3);
        el.style.filter = `brightness(${(0.45 + lit * 0.6).toFixed(3)}) saturate(${(0.6 + lit * 0.5).toFixed(3)})`;
        el.style.zIndex = String(Math.round(c * 100) + 100);
      });
      if (best !== lastFront) { lastFront = best; setFront(best); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  const spinTo = (i) => {
    const s = state.current;
    // nearest equivalent angle that puts card i at the front
    const want = -i * step;
    const k = Math.round((s.angle - want) / 360);
    s.target = want + k * 360;
    s.vel = 0;
  };

  // drag via window listeners (no pointer capture, so card clicks still land)
  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const s = state.current;
    s.drag = { last: e.clientX, t: performance.now(), moved: 0 };
    s.dragMoved = 0;
    s.target = null;
    const move = (ev) => {
      if (!s.drag) return;
      const dx = ev.clientX - s.drag.last;
      const now = performance.now();
      s.angle += dx * 0.35;
      s.vel = (dx * 0.35) / Math.max((now - s.drag.t) / 1000, 0.008);
      s.drag.last = ev.clientX;
      s.drag.t = now;
      s.drag.moved += Math.abs(dx);
    };
    const up = () => {
      s.dragMoved = s.drag?.moved || 0;
      s.drag = null;
      s.vel = Math.max(-400, Math.min(400, s.vel));
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const onCardClick = (i, e) => {
    if ((state.current.dragMoved || 0) > 6) return; // that was a drag, not a click
    if (i === front) onOpen?.(products[i], e.currentTarget.querySelector('img'));
    else spinTo(i);
  };

  const onKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); spinTo((front + 1) % n); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); spinTo((front - 1 + n) % n); }
  };

  return (
    <div
      className="nv-orbit3d"
      data-cursor="drag"
      onPointerDown={onPointerDown}
      onPointerEnter={() => { state.current.hover = true; }}
      onPointerLeave={() => { state.current.hover = false; }}
      onKeyDown={onKey}
      role="group"
      aria-roledescription="carousel"
      aria-label="Featured products"
    >
      <div className="nv-orbit3d-floor" aria-hidden="true" />
      <div ref={ringRef} className="nv-orbit3d-ring">
        {products.map((p, i) => (
          <button
            key={p.id}
            type="button"
            ref={(el) => { cardsRef.current[i] = el; }}
            className={`nv-orbit3d-card ${i === front ? 'is-front' : ''}`}
            style={{ transform: `rotateY(${i * step}deg) translateZ(var(--r))` }}
            onClick={(e) => onCardClick(i, e)}
            data-cursor={i === front ? 'view' : 'spin'}
            aria-label={`${p.name}, ${formatPrice(p.price)}${i === front ? ' — open product' : ' — bring to front'}`}
          >
            <img src={p.images?.[0]} alt="" loading="eager" draggable="false" onError={(e) => { e.currentTarget.style.opacity = '0'; }} />
            <span className="nv-orbit3d-shade" />
            <span className="nv-orbit3d-meta">
              <span className="nv-orbit3d-cat">[ {p.category.replace('-', ' ')} ]</span>
              <span className="nv-orbit3d-name">{p.name}</span>
              <span className="nv-orbit3d-price">{formatPrice(p.price)}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="nv-orbit3d-hud" aria-hidden="true">
        <span>{String(front + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
        <span>DRAG TO SPIN · CLICK TO OPEN</span>
      </div>
    </div>
  );
};

export default OrbitCarousel;
