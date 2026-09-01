import { useEffect, useRef } from 'react';
import { steer, useSteerActive } from '../state/playerStore';

/** Must match the pad radius used by useVaultPointer for the knob to reach
 *  the ring exactly as the courier reaches full speed. */
function padRadius() {
  const min = Math.min(window.innerWidth, window.innerHeight);
  return Math.max(64, Math.min(150, min * 0.19));
}

/**
 * The stick that appears under a held pointer.
 *
 * Analog speed is invisible without it: the player can feel that pulling
 * further runs faster, but they cannot see how much further there is to pull,
 * so the ring is the speedometer. It draws where the press landed rather than
 * in a fixed corner, because a thumb that has to find a painted stick is a
 * thumb looking at its own hand instead of at the world.
 *
 * Positions are written straight to the DOM node from a rAF loop. Routing
 * pointer movement through React state would re-render the overlay at input
 * rate, which is the one thing the whole store layer exists to avoid.
 */
const SteerPad = () => {
  const active = useSteerActive();
  const rootRef = useRef(null);
  const knobRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;
    let frame = 0;
    const radius = padRadius();

    const tick = () => {
      frame = requestAnimationFrame(tick);
      const root = rootRef.current;
      if (!root) return;

      root.style.transform = `translate3d(${steer.originX}px, ${steer.originY}px, 0)`;

      const knob = knobRef.current;
      if (knob) {
        // Clamped to the ring: past full speed the stick has nothing left to
        // say, and letting the knob fly off with the pointer would suggest
        // otherwise.
        const reach = Math.min(1, steer.magnitude) * radius;
        knob.style.transform = `translate3d(${steer.x * reach - 18}px, ${steer.y * reach - 18}px, 0)`;
      }

      const ring = ringRef.current;
      if (ring) {
        // The ring brightens with the pull, so "I am running" is legible in
        // peripheral vision without looking away from the courier.
        ring.style.opacity = String(0.25 + steer.magnitude * 0.5);
        ring.style.borderColor = `rgba(34, 211, 238, ${0.3 + steer.magnitude * 0.6})`;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  if (!active) return null;

  const radius = padRadius();

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed left-0 top-0 z-20 will-change-transform"
      aria-hidden="true"
    >
      <div
        ref={ringRef}
        className="absolute rounded-full border border-accent-secondary/40 bg-accent-secondary/5 backdrop-blur-[1px]"
        style={{
          width: radius * 2,
          height: radius * 2,
          left: -radius,
          top: -radius,
          transition: 'opacity 120ms linear',
        }}
      />
      {/* Anchor dot: where the press actually landed, so the direction of the
          pull is readable even when the knob is near the rim. */}
      <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-accent-secondary/70" />
      <div
        ref={knobRef}
        className="absolute h-9 w-9 rounded-full border border-accent-secondary/70 bg-accent-secondary/20 shadow-[0_0_20px_rgba(34,211,238,0.45)] will-change-transform"
      />
    </div>
  );
};

export default SteerPad;
