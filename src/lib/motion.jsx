import { useCallback, useEffect, useRef, useState } from 'react';
import { useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { clamp } from '../utils/helpers';

/**
 * Shared motion tokens so hero-scale moments and micro-interactions
 * draw from the same easing vocabulary instead of ad hoc per-component curves.
 */
export const springTransition = { duration: 0.9, ease: [0.34, 1.56, 0.64, 1] };
export const smoothTransition = { duration: 0.7, ease: [0.16, 1, 0.3, 1] };
const EASE_OUT = [0.16, 1, 0.3, 1];

/** Shared viewport trigger so scroll-reveals fire at a consistent scroll position site-wide. */
export const viewportOnce = { once: true, amount: 0.2 };
export const viewportOnceEarly = { once: true, amount: 0.1 };

export const staggerContainer = (staggerChildren = 0.12, delayChildren = 0) => ({
  hidden: {},
  visible: {
    transition: { staggerChildren, delayChildren },
  },
});

export const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: smoothTransition },
};

/** For text lines: parent needs `overflow-hidden` so this reads as a mask wipe, not a slide. */
export const maskReveal = {
  hidden: { y: '110%' },
  visible: { y: '0%', transition: springTransition },
};

/** For a masked product/image reveal via clip-path rather than a translate. */
export const clipReveal = {
  hidden: { clipPath: 'inset(0% 0% 100% 0%)', scale: 1.08 },
  visible: {
    clipPath: 'inset(0% 0% 0% 0%)',
    scale: 1,
    transition: { ...springTransition, duration: 1.1 },
  },
};

/** Gentler image reveal for editorial/article imagery — no scale punch. */
export const imageRevealSoft = {
  hidden: { clipPath: 'inset(0% 0% 100% 0%)' },
  visible: { clipPath: 'inset(0% 0% 0% 0%)', transition: { ...smoothTransition, duration: 0.9 } },
};

const intensityPresets = {
  subtle: { y: 12, duration: 0.4 },
  standard: { y: 22, duration: 0.55 },
  strong: { y: 34, duration: 0.7 },
};

/**
 * Section-level reveal with a configurable intensity so restrained pages
 * (checkout, account) and editorial pages (journal, press) don't read identically.
 */
export function sectionReveal(intensity = 'standard', delay = 0) {
  const preset = intensityPresets[intensity] || intensityPresets.standard;
  return {
    hidden: { opacity: 0, y: preset.y },
    visible: { opacity: 1, y: 0, transition: { duration: preset.duration, ease: EASE_OUT, delay } },
  };
}

/** Drop-in reveal wrapper: pass `as={motion.section}` (etc.) to change the element. */
export function Reveal({
  as: Component,
  intensity = 'standard',
  delay = 0,
  viewport = viewportOnce,
  className,
  children,
  ...props
}) {
  const El = Component || 'div';
  return (
    <El
      variants={sectionReveal(intensity, delay)}
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      className={className}
      {...props}
    >
      {children}
    </El>
  );
}

/** Whole-page entrance/exit for the router-driven page transition wrapper. */
export const pageEntranceVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
};

/** Shared hover-lift for cards/tiles — spring-based, transform-only. */
export const hoverLift = { y: -6, transition: { type: 'spring', stiffness: 300, damping: 22 } };
export const hoverLiftSoft = { y: -3, transition: { type: 'spring', stiffness: 300, damping: 24 } };

/**
 * Cursor-driven magnetic pull for a single hero-scale CTA. Deliberately not
 * wired into Button.jsx itself — apply to the wrapping element so it stays
 * an opt-in effect for the one moment that earns it.
 */
export function useMagnetic({ strength = 0.3, max = 10, enabled = true } = {}) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 300, damping: 20, mass: 0.4 });

  const onMouseMove = useCallback((e) => {
    if (!enabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = e.clientX - (rect.left + rect.width / 2);
    const relY = e.clientY - (rect.top + rect.height / 2);
    x.set(clamp(relX * strength, -max, max));
    y.set(clamp(relY * strength, -max, max));
  }, [enabled, strength, max, x, y]);

  const onMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  if (!enabled) {
    return { ref, style: undefined, handlers: {} };
  }

  return { ref, style: { x: springX, y: springY }, handlers: { onMouseMove, onMouseLeave } };
}

function getViewportTier() {
  if (typeof window === 'undefined') return 'desktop';
  const pointerFine = window.matchMedia('(pointer: fine)').matches;
  if (!pointerFine) return 'touch';
  return window.innerWidth >= 1024 ? 'desktop' : 'tablet';
}

/** Desktop gets cursor/parallax effects, tablet gets reduced intensity, touch gets none. */
function useViewportTier() {
  const [tier, setTier] = useState(getViewportTier);
  useEffect(() => {
    const update = () => setTier(getViewportTier());
    window.addEventListener('resize', update);
    const mq = window.matchMedia('(pointer: fine)');
    mq.addEventListener('change', update);
    return () => {
      window.removeEventListener('resize', update);
      mq.removeEventListener('change', update);
    };
  }, []);
  return tier;
}

/**
 * One hook for the "should this component do the fancy thing" question —
 * respects prefers-reduced-motion and scales back on tablet/touch so pointer
 * tracking and parallax never run where they can't be enjoyed (or afforded).
 */
export function useMotionProfile() {
  const prefersReducedMotion = useReducedMotion();
  const tier = useViewportTier();
  const cursorEffectsEnabled = tier === 'desktop' && !prefersReducedMotion;
  const intensity = prefersReducedMotion ? 'subtle' : tier === 'desktop' ? 'strong' : tier === 'tablet' ? 'standard' : 'subtle';
  return { prefersReducedMotion, tier, cursorEffectsEnabled, intensity, isTouch: tier === 'touch' };
}
