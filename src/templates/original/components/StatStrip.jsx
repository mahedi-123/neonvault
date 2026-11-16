import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'motion/react';
import { viewportOnce } from '../lib/motion';
import { cn } from '../utils/helpers';

/** Ease-out so the number decelerates into its final value instead of
 *  stopping dead — a linear count reads like a spinner, not a readout. */
const easeOut = (t) => 1 - (1 - t) ** 3;

function useCountUp(target, active, duration = 1400) {
  const prefersReducedMotion = useReducedMotion();
  const [value, setValue] = useState(prefersReducedMotion ? target : 0);

  useEffect(() => {
    if (!active || prefersReducedMotion) {
      if (prefersReducedMotion) setValue(target);
      return undefined;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(easeOut(t) * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration, prefersReducedMotion]);

  return value;
}

const Stat = ({ stat, active }) => {
  const value = useCountUp(stat.value, active);
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.5, delay: stat.delay }}
      className="group relative flex-1 border-t border-border/60 pt-5 sm:pt-6"
    >
      {/* Rail that fills in on hover — a small reward for pointing at it. */}
      <span className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-accent transition-transform duration-500 group-hover:scale-x-100" />
      <p className="font-display text-[clamp(1.75rem,5vw,2.75rem)] font-extrabold leading-none tracking-tight text-text tabular-nums">
        {stat.prefix}
        {value.toLocaleString()}
        {stat.suffix}
      </p>
      <p className="mt-2 font-body text-xs uppercase tracking-[0.18em] text-text-subtle">
        {stat.label}
      </p>
    </motion.div>
  );
};

/**
 * A row of figures that count up the first time they scroll into view.
 *
 * Counting is the whole point: the numbers are the same either way, but a
 * value that arrives already settled is read as decoration, while one that
 * spins up is read as a live measurement. Fires once — a strip that
 * re-counts every time it passes the viewport becomes a nuisance on the way
 * back up the page. Under prefers-reduced-motion the final value is rendered
 * immediately and no animation frame is ever scheduled.
 */
const StatStrip = ({ stats, className = '' }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <div ref={ref} className={cn('flex flex-col gap-6 sm:flex-row sm:gap-8 lg:gap-12', className)}>
      {stats.map((stat, i) => (
        <Stat key={stat.label} stat={{ ...stat, delay: i * 0.08 }} active={inView} />
      ))}
    </div>
  );
};

export default StatStrip;
